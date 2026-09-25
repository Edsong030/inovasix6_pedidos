import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  @Get()
  findAll(@CurrentUser() u: any) {
    return this.svc.findAll(u.restaurantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.findOne(id, u.restaurantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() dto: CreateCategoryDto, @CurrentUser() u: any) {
    return this.svc.create(u.restaurantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: CreateCategoryDto, @CurrentUser() u: any) {
    return this.svc.update(id, u.restaurantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.remove(id, u.restaurantId);
  }
}
