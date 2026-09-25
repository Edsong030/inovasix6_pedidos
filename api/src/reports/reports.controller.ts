import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('sales')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiQuery({ name: 'startDate', example: '2026-09-01' })
  @ApiQuery({ name: 'endDate', example: '2026-09-30' })
  sales(
    @CurrentUser() u: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.svc.getSalesReport(u.restaurantId, startDate, endDate);
  }

  @Get('history')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  history(
    @CurrentUser() u: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
  ) {
    return this.svc.getOrderHistory(
      u.restaurantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      { status, channel },
    );
  }
}
