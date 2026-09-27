import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { parseHistoryParams, parseSalesRange } from './report-params';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FINANCE_ROLES } from '../common/permissions';

@ApiTags('Reports')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('sales')
  @Roles(...FINANCE_ROLES)
  @ApiQuery({ name: 'startDate', example: '2026-09-01', required: true })
  @ApiQuery({ name: 'endDate', example: '2026-09-30', required: true })
  @ApiBadRequestResponse({ description: 'Datas ausentes, fora do formato AAAA-MM-DD, inexistentes ou início após o fim' })
  sales(
    @CurrentUser() u: any,
    @Query('startDate') startDate: unknown,
    @Query('endDate') endDate: unknown,
  ) {
    const range = parseSalesRange(startDate, endDate);
    return this.svc.getSalesReport(u.restaurantId, range.startDate, range.endDate);
  }

  @Get('history')
  @Roles(...FINANCE_ROLES)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiBadRequestResponse({ description: 'page/limit fora do intervalo ou status/channel desconhecido' })
  history(
    @CurrentUser() u: any,
    @Query('page') page?: unknown,
    @Query('limit') limit?: unknown,
    @Query('status') status?: unknown,
    @Query('channel') channel?: unknown,
  ) {
    const p = parseHistoryParams({ page, limit, status, channel });
    return this.svc.getOrderHistory(u.restaurantId, p.page, p.limit, { status: p.status, channel: p.channel });
  }
}
