/**
 * URL pública de um arquivo enviado, gravada no cadastro (produto, logo).
 *
 * Nunca usa Host, X-Forwarded-* nem o protocolo da requisição: esses valores vêm do
 * cliente e envenenariam URLs persistidas (ex.: apontar a imagem para outro domínio).
 *
 * • PUBLIC_API_URL definida (ex.: https://api.seudominio.com) → URL absoluta nela.
 *   Aceita também a forma com "/api" no fim; os arquivos são servidos em /uploads.
 * • Não definida ou inválida → URL relativa segura: /uploads/<pasta>/<arquivo>.
 */
export function publicUploadUrl(relativePath: string): string {
  const path = `/uploads/${relativePath.replace(/^\/+/, '')}`;
  const base = publicApiBase();
  return base ? `${base}${path}` : path;
}

/** Origem pública da API (sem "/api" e sem barra final), ou null se não configurada/inválida. */
export function publicApiBase(): string | null {
  const raw = (process.env.PUBLIC_API_URL ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password || u.search || u.hash) return null;
    return `${u.origin}${u.pathname.replace(/\/+$/, '').replace(/\/api$/, '')}`;
  } catch {
    return null;
  }
}
