import {
  Controller, Post, Get, Body, Headers, Param,
  UseGuards, Logger, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AnotaAiService } from './anota-ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Integrations - Anota AI')
@Controller('integrations/anota-ai')
export class AnotaAiController {
  private readonly logger = new Logger(AnotaAiController.name);

  constructor(private svc: AnotaAiService) {}

  /**
   * Webhook público — chamado pela Anota AI.
   * O restaurantId é identificado pelo slug na URL.
   */
  @Post('webhook/:restaurantId/order-placed')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook: pedido recebido da Anota AI' })
  async orderPlaced(
    @Param('restaurantId') restaurantId: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-anota-signature') _signature: string,
  ) {
    const externalId = String(payload['orderId'] ?? payload['id'] ?? Date.now());
    return this.svc.handleWebhook(restaurantId, 'ORDER_PLACED', externalId, payload);
  }

  @Post('webhook/:restaurantId/order-updated')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook: pedido atualizado pela Anota AI' })
  async orderUpdated(
    @Param('restaurantId') restaurantId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const externalId = `upd_${payload['orderId'] ?? payload['id'] ?? Date.now()}`;
    return this.svc.handleWebhook(restaurantId, 'ORDER_UPDATED', externalId, payload);
  }

  @Post('webhook/:restaurantId/order-cancelled')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook: pedido cancelado pela Anota AI' })
  async orderCancelled(
    @Param('restaurantId') restaurantId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const externalId = `cnl_${payload['orderId'] ?? payload['id'] ?? Date.now()}`;
    return this.svc.handleWebhook(restaurantId, 'ORDER_CANCELLED', externalId, payload);
  }

  // Rota autenticada para consultar eventos
  @Get('events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getEvents(@CurrentUser() u: any) {
    return this.svc.getEvents(u.restaurantId);
  }
}
