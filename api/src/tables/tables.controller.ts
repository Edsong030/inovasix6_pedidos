import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableStatusDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TABLE_READ_ROLES, TABLE_STATUS_ROLES } from '../common/permissions';

@ApiTags('Tables')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private svc: TablesService) {}

  @Get()
  @Roles(...TABLE_READ_ROLES)
  findAll(@CurrentUser() u: any) {
    return this.svc.findAll(u.restaurantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateTableDto, @CurrentUser() u: any) {
    return this.svc.create(u.restaurantId, dto);
  }

  @Patch(':id/status')
  @Roles(...TABLE_STATUS_ROLES)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
    @CurrentUser() u: any,
  ) {
    return this.svc.updateStatus(id, u.restaurantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.remove(id, u.restaurantId);
  }
}
