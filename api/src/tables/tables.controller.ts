import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableStatusDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private svc: TablesService) {}

  @Get()
  findAll(@CurrentUser() u: any) {
    return this.svc.findAll(u.restaurantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateTableDto, @CurrentUser() u: any) {
    return this.svc.create(u.restaurantId, dto);
  }

  @Patch(':id/status')
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
