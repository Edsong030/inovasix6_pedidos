import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Assinatura dos webhooks da Anota AI: HMAC-SHA256 do corpo BRUTO da requisição com
 * ANOTA_AI_WEBHOOK_SECRET, em hexadecimal, no cabeçalho `x-anota-signature`
 * (aceita "sha256=<hex>" ou só "<hex>").
 *
 * Confirmar com a Anota AI, antes de ativar, o nome do cabeçalho e o formato exatos.
 */
export const SIGNATURE_HEADER = 'x-anota-signature';
const HEX_SHA256 = /^[0-9a-f]{64}$/i;

export function signPayload(secret: string, rawBody: Buffer | string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/** true só se a assinatura confere com o corpo recebido. Nunca lança; compara em tempo constante. */
export function verifyWebhookSignature(rawBody: Buffer | undefined, header: string | string[] | undefined, secret: string): boolean {
  if (!secret || !rawBody || typeof header !== 'string') return false;
  const provided = header.trim().replace(/^sha256=/i, '');
  if (!HEX_SHA256.test(provided)) return false;
  const expected = Buffer.from(signPayload(secret, rawBody), 'hex');
  const received = Buffer.from(provided, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
