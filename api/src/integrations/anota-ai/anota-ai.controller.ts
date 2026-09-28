import {
  Controller, Post, Get, Body, Param,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnotaAiService } from './anota-ai.service';
import { AnotaWebhookSignatureGuard } from './webhook-signature.guard';
import { SIGNATURE_HEADER } from './webhook-signature';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const SIGNATURE_DOC = { name: SIGNATURE_HEADER, description: 'HMAC-SHA256 (hex) do corpo bruto com ANOTA_AI_WEBHOOK_SECRET; aceita "sha256=<hex>"', required: true };

@ApiTags('Integrations - Anota AI')
@Controller('integrations/anota-ai')
export class AnotaAiController {
  constructor(private svc: AnotaAiService) {}

  /**
   * Webhooks públicos (chamados pela Anota AI). A assinatura é conferida pela guarda
   * ANTES de qualquer leitura do payload ou gravação no banco.
   */
  @Post('webhook/:restaurantId/order-placed')
  @HttpCode(200)
  @UseGuards(AnotaWebhookSignatureGuard)
  @ApiHeader(SIGNATURE_DOC)
  @ApiOperation({ summary: 'Webhook: pedido recebido da Anota AI' })
  @ApiResponse({ status: 401, description: 'Assinatura ausente ou inválida' })
  @ApiResponse({ status: 403, description: 'Integração ativa sem segredo configurado' })
  orderPlaced(@Param('restaurantId') restaurantId: string, @Body() payload: Record<string, unknown>) {
    return this.svc.handleWebhook(restaurantId, 'ORDER_PLACED', payload);
  }

  @Post('webhook/:restaurantId/order-updated')
  @HttpCode(200)
  @UseGuards(AnotaWebhookSignatureGuard)
  @ApiHeader(SIGNATURE_DOC)
  @ApiOperation({ summary: 'Webhook: pedido atualizado pela Anota AI' })
  orderUpdated(@Param('restaurantId') restaurantId: string, @Body() payload: Record<string, unknown>) {
    return this.svc.handleWebhook(restaurantId, 'ORDER_UPDATED', payload);
  }

  @Post('webhook/:restaurantId/order-cancelled')
  @HttpCode(200)
  @UseGuards(AnotaWebhookSignatureGuard)
  @ApiHeader(SIGNATURE_DOC)
  @ApiOperation({ summary: 'Webhook: pedido cancelado pela Anota AI' })
  orderCancelled(@Param('restaurantId') restaurantId: string, @Body() payload: Record<string, unknown>) {
    return this.svc.handleWebhook(restaurantId, 'ORDER_CANCELLED', payload);
  }

  // Rota autenticada para consultar eventos
  @Get('events')
  @ApiCookieAuth('inx_session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getEvents(@CurrentUser() u: any) {
    return this.svc.getEvents(u.restaurantId);
  }
}
