// Formulário de login: sem JavaScript, o envio nativo do navegador não pode usar GET
// (a senha iria para a URL, o histórico e os logs). Ver app/(auth)/login/page.tsx.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const forms = (html) => html.match(/<form\b[^>]*>/gi) ?? []

test('código-fonte: o formulário de login declara method="post"', () => {
  const src = readFileSync(join(root, 'app/(auth)/login/page.tsx'), 'utf8')
  const tags = src.match(/<form\b[^>]*>/g) ?? []
  assert.equal(tags.length, 1, 'esperado um único <form> na página de login')
  assert.match(tags[0], /\bmethod="post"/)
  assert.doesNotMatch(tags[0], /\baction=/, 'sem action: envia para a própria rota')
})

// HTML gerado pelo build (local e demo): valida o que o navegador realmente recebe
for (const [label, file] of [
  ['build local', '.next/server/app/login.html'],
  ['build demo (out/)', 'out/login/index.html'],
]) {
  const path = join(root, file)
  test(`HTML do ${label}: <form method="post">`, { skip: !existsSync(path) && `${file} ausente (rode o build)` }, () => {
    const tags = forms(readFileSync(path, 'utf8'))
    assert.equal(tags.length, 1)
    assert.match(tags[0], /\bmethod="post"/i)
    assert.doesNotMatch(tags[0], /\bmethod="get"/i)
  })
}
