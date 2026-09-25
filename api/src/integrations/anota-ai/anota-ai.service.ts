import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AnotaEventType } from '@prisma/client';

@Injectable()
export class AnotaAiService {
  private readonly logger = new Logger(AnotaAiService.name);
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.enabled = config.get<string>('ANOTA_AI_ENABLED', 'false') === 'true';
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Registra evento recebido do webhook da Anota AI.
   * Utiliza idempotency key (externalId) para evitar duplicatas.
   */
  async handleWebhook(
    restaurantId: string,
    eventType: AnotaEventType,
    externalId: string,
    payload: Record<string, unknown>,
  ) {
    if (!this.enabled) {
      this.logger.warn('Integração Anota AI desativada. Ignorando webhook.');
      return { ignored: true, reason: 'integration_disabled' };
    }

    // Verifica duplicata
    const existing = await this.prisma.anotaAiEvent.findUnique({
      where: { restaurantId_externalId: { restaurantId, externalId } },
    });
    if (existing) {
      await this.prisma.anotaAiEvent.update({
        where: { id: existing.id },
        data: { status: 'DUPLICATE' },
      });
      this.logger.warn(`Evento duplicado: ${externalId}`);
      return { duplicate: true, eventId: existing.id };
    }

    // Persiste o evento
    const event = await this.prisma.anotaAiEvent.create({
      data: { restaurantId, eventType, externalId, payload: payload as object, status: 'PENDING' as const },
    });

    try {
      await this.processEvent(event.id, eventType, payload, restaurantId);
      await this.prisma.anotaAiEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return { processed: true, eventId: event.id };
    } catch (error: any) {
      await this.prisma.anotaAiEvent.update({
        where: { id: event.id },
        data: { status: 'FAILED', errorMessage: error?.message },
      });
      throw error;
    }
  }

  private async processEvent(
    _eventId: string,
    eventType: AnotaEventType,
    _payload: Record<string, unknown>,
    _restaurantId: string,
  ) {
    // TODO: mapear payload Anota AI para Order quando integração for ativada
    this.logger.log(`Processando evento ${eventType}`);
    // Implementação futura: criar/atualizar/cancelar pedido baseado no payload
  }

  async getEvents(restaurantId: string) {
    return this.prisma.anotaAiEvent.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
