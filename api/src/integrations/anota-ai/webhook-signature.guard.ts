import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AnotaAiService } from './anota-ai.service';
import { SIGNATURE_HEADER, verifyWebhookSignature } from './webhook-signature';

/**
 * Barreira dos webhooks da Anota AI, antes de qualquer processamento ou gravação:
 * • integração desativada → deixa passar; o serviço responde "ignorado" sem tocar no banco;
 * • ativada sem ANOTA_AI_WEBHOOK_SECRET → 403 (configuração insegura);
 * • assinatura ausente, malformada, errada ou corpo alterado → 401.
 * Nunca registra payload, assinatura nem segredo em log.
 */
@Injectable()
export class AnotaWebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(AnotaWebhookSignatureGuard.name);

  constructor(
    private anota: AnotaAiService,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.anota.isEnabled()) return true;

    const secret = (this.config.get<string>('ANOTA_AI_WEBHOOK_SECRET') ?? '').trim();
    if (!secret) {
      this.logger.error('Webhook Anota AI recusado: integração ativa sem ANOTA_AI_WEBHOOK_SECRET configurado');
      throw new ForbiddenException('Integração sem segredo configurado');
    }

    const req = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    if (!verifyWebhookSignature(req.rawBody, req.headers[SIGNATURE_HEADER], secret)) {
      this.logger.warn('Webhook Anota AI recusado: assinatura ausente ou inválida');
      throw new UnauthorizedException('Assinatura inválida');
    }
    return true;
  }
}
