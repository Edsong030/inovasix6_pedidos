// URLs de arquivos enviados: a API devolve '/uploads/...' (relativa) ou uma URL absoluta
// baseada em PUBLIC_API_URL. O web resolve a relativa contra a origem da API.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asset, apiOrigin } from '../lib/asset.ts'
import { isValidLogoUrl } from '../lib/settings.ts'

test('origem da API a partir de NEXT_PUBLIC_API_URL (sem "/api")', () => {
  assert.equal(apiOrigin('http://localhost:3001/api'), 'http://localhost:3001')
  assert.equal(apiOrigin('https://api.exemplo.com/api/'), 'https://api.exemplo.com')
  assert.equal(apiOrigin('https://exemplo.com/backend/api'), 'https://exemplo.com/backend')
  assert.equal(apiOrigin('não é url'), '')
})

test('modo API: /uploads/... é servido pela API; demais caminhos e URLs absolutas intactos', () => {
  assert.equal(asset('/uploads/products/abc.jpg'), 'http://localhost:3001/uploads/products/abc.jpg')
  assert.equal(asset('https://api.exemplo.com/uploads/products/abc.jpg'), 'https://api.exemplo.com/uploads/products/abc.jpg')
  assert.equal(asset('/brand/logo.png'), '/brand/logo.png')
  assert.equal(asset('/demo/products/images/x.jpg'), '/demo/products/images/x.jpg')
})

test('logo: aceita http(s) e o caminho de upload; recusa caminhos arbitrários', () => {
  assert.equal(isValidLogoUrl('/uploads/logos/0123456789abcdef0123456789abcdef.png', false), true)
  assert.equal(isValidLogoUrl('https://api.exemplo.com/uploads/logos/a.png', false), true)
  for (const bad of ['/uploads/logos/../../etc/passwd', '/uploads/products/a.png', '/uploads/logos/a.svg', 'javascript:alert(1)', '/qualquer/coisa.png']) {
    assert.equal(isValidLogoUrl(bad, false), false, bad)
  }
})
