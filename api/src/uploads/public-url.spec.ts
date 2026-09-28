import { publicApiBase, publicUploadUrl } from './public-url';

describe('publicUploadUrl', () => {
  const env = process.env.PUBLIC_API_URL;
  afterEach(() => { if (env === undefined) delete process.env.PUBLIC_API_URL; else process.env.PUBLIC_API_URL = env; });

  it('sem PUBLIC_API_URL: URL relativa segura', () => {
    delete process.env.PUBLIC_API_URL;
    expect(publicUploadUrl('products/a.jpg')).toBe('/uploads/products/a.jpg');
  });
  it('com PUBLIC_API_URL: URL absoluta (com ou sem "/api" e barra no fim)', () => {
    for (const v of ['https://api.exemplo.com', 'https://api.exemplo.com/', 'https://api.exemplo.com/api', 'https://api.exemplo.com/api/']) {
      process.env.PUBLIC_API_URL = v;
      expect(publicUploadUrl('logos/b.png')).toBe('https://api.exemplo.com/uploads/logos/b.png');
    }
  });
  it('valor inválido ou perigoso cai na URL relativa', () => {
    for (const v of ['javascript:alert(1)', 'ftp://x.com', 'não é url', 'https://user:pass@x.com', 'https://x.com/?q=1', '  ']) {
      process.env.PUBLIC_API_URL = v;
      expect(publicApiBase()).toBeNull();
      expect(publicUploadUrl('products/a.jpg')).toBe('/uploads/products/a.jpg');
    }
  });
});
