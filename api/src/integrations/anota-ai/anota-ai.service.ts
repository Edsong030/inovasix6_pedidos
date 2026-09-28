import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AnotaEventType, Prisma } from '@prisma/client';

/** Prefixo do externalId por tipo de evento (o mesmo pedido pode ter criação, atualização e cancelamento). */
const EVENT_PREFIX: Record<AnotaEventType, string> = { ORDER_PLACED: '', ORDER_UPDATED: 'upd_', ORDER_CANCELLED: 'cnl_' };

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
   * Registra evento recebido do webhook da Anota AI (a assinatura já foi conferida pela
   * AnotaWebhookSignatureGuard). Idempotente: o mesmo evento repetido não gera nova linha
   * nem altera o evento original. Não registra o payload em log.
   */
  async handleWebhook(restaurantId: string, eventType: AnotaEventType, payload: Record<string, unknown>) {
    if (!this.enabled) {
      this.logger.warn('Integração Anota AI desativada. Ignorando webhook.');
      return { ignored: true, reason: 'integration_disabled' };
    }

    // Chave de idempotência: id do pedido na Anota AI (obrigatório; sem ele não há como
    // reconhecer reenvios do mesmo evento)
    const rawId = payload?.['orderId'] ?? payload?.['id'];
    const orderRef = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : '';
    if (!orderRef || orderRef.length > 100) throw new BadRequestException('Evento sem identificador do pedido');
    const externalId = `${EVENT_PREFIX[eventType]}${orderRef}`;

    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
    if (!restaurant) throw new NotFoundException('Estabelecimento não encontrado');

    // Atômico: a chave única (restaurantId, externalId) decide quem grava; o reenvio
    // simultâneo ou posterior cai no P2002 e não altera o evento já registrado
    let event;
    try {
      event = await this.prisma.anotaAiEvent.create({
        data: { restaurantId, eventType, externalId, payload: payload as object, status: 'PENDING' as const },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.anotaAiEvent.findUnique({
          where: { restaurantId_externalId: { restaurantId, externalId } },
          select: { id: true },
        });
        this.logger.warn(`Evento ${eventType} repetido: ignorado (idempotência)`);
        return { duplicate: true, eventId: existing?.id };
      }
      throw e;
    }

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
