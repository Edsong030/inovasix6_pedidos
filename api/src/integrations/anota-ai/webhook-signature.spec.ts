import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { signPayload, verifyWebhookSignature } from './webhook-signature';
import { AnotaWebhookSignatureGuard } from './webhook-signature.guard';

const SECRET = 'segredo-do-webhook-de-teste';
const body = Buffer.from(JSON.stringify({ orderId: 'A-1', total: 50 }));

describe('verifyWebhookSignature', () => {
  it('aceita a assinatura correta (hex puro ou "sha256=")', () => {
    const sig = signPayload(SECRET, body);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${sig}`, SECRET)).toBe(true);
    expect(verifyWebhookSignature(body, sig.toUpperCase(), SECRET)).toBe(true);
  });
  it('recusa assinatura ausente, vazia, malformada ou de tamanho errado', () => {
    for (const h of [undefined, '', 'abc', 'z'.repeat(64), signPayload(SECRET, body).slice(0, 63), ['a', 'b']]) {
      expect(verifyWebhookSignature(body, h as never, SECRET)).toBe(false);
    }
  });
  it('recusa payload alterado (mesma assinatura, um byte a mais)', () => {
    const sig = signPayload(SECRET, body);
    const tampered = Buffer.from(JSON.stringify({ orderId: 'A-1', total: 5 }));
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });
  it('recusa assinatura feita com outro segredo, e segredo vazio', () => {
    expect(verifyWebhookSignature(body, signPayload('outro-segredo', body), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, signPayload('', body), '')).toBe(false);
  });
  it('recusa quando o corpo bruto não foi capturado', () => {
    expect(verifyWebhookSignature(undefined, signPayload(SECRET, body), SECRET)).toBe(false);
  });
});

describe('AnotaWebhookSignatureGuard', () => {
  const ctx = (headers: Record<string, string>, rawBody?: Buffer) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ headers, rawBody }) }) }) as never;
  const guard = (enabled: boolean, secret?: string) =>
    new AnotaWebhookSignatureGuard({ isEnabled: () => enabled } as never, { get: () => secret } as never);

  it('integração desativada: passa (o serviço ignora sem gravar)', () => {
    expect(guard(false).canActivate(ctx({}))).toBe(true);
  });
  it('ativa sem segredo: 403', () => {
    expect(() => guard(true, '').canActivate(ctx({}, body))).toThrow(ForbiddenException);
    expect(() => guard(true, undefined).canActivate(ctx({}, body))).toThrow(ForbiddenException);
  });
  it('ativa: sem assinatura ou assinatura errada → 401; correta → passa', () => {
    expect(() => guard(true, SECRET).canActivate(ctx({}, body))).toThrow(UnauthorizedException);
    expect(() => guard(true, SECRET).canActivate(ctx({ 'x-anota-signature': 'f'.repeat(64) }, body))).toThrow(UnauthorizedException);
    expect(guard(true, SECRET).canActivate(ctx({ 'x-anota-signature': signPayload(SECRET, body) }, body))).toBe(true);
  });
});
