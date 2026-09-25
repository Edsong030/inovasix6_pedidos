import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() u: any) {
    return this.svc.getDashboard(u.restaurantId);
  }

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'date', required: false })
  findAll(
    @CurrentUser() u: any,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('date') date?: string,
  ) {
    return this.svc.findAll(u.restaurantId, { status, channel, date });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.findOne(id, u.restaurantId);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() u: any) {
    return this.svc.create(u.restaurantId, u.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() u: any,
  ) {
    return this.svc.updateStatus(id, u.restaurantId, dto);
  }
}
