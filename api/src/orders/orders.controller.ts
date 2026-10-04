import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ORDER_CREATE_ROLES, ORDER_READ_ROLES } from '../common/permissions';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Orders')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  /** Resumo do dia; faturamento só para ADMIN/MANAGER; DELIVERY vê só pedidos de delivery. */
  @Get('dashboard')
  @Roles(...ORDER_READ_ROLES)
  dashboard(@CurrentUser() u: AuthUser) {
    return this.svc.getDashboard(u.restaurantId, u.role);
  }

  @Get()
  @Roles(...ORDER_READ_ROLES)
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'date', required: false })
  findAll(
    @CurrentUser() u: AuthUser,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('date') date?: string,
  ) {
    return this.svc.findAll(u.restaurantId, { status, channel, date }, u.role);
  }

  @Get(':id')
  @Roles(...ORDER_READ_ROLES)
  findOne(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.findOne(id, u.restaurantId, u.role);
  }

  @Post()
  @Roles(...ORDER_CREATE_ROLES)
  create(@Body() dto: CreateOrderDto, @CurrentUser() u: AuthUser) {
    return this.svc.create(u.restaurantId, u.id, dto);
  }

  /** Cada transição tem seu próprio conjunto de papéis (ver common/permissions.ts). */
  @Patch(':id/status')
  @Roles(...ORDER_READ_ROLES)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() u: AuthUser,
  ) {
    // u.id: quem executa a mudança (sessão validada no banco), gravado no histórico
    return this.svc.updateStatus(id, u.restaurantId, dto, u.role, u.id);
  }
}
