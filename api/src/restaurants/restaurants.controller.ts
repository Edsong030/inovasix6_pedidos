import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private svc: RestaurantsService) {}

  /** Configurações do estabelecimento do usuário logado (inclui o tipo de negócio). */
  @Get('settings')
  settings(@CurrentUser() u: { restaurantId: string }) {
    return this.svc.getSettings(u.restaurantId);
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  updateSettings(@CurrentUser() u: { restaurantId: string }, @Body() dto: UpdateRestaurantSettingsDto) {
    return this.svc.updateSettings(u.restaurantId, dto);
  }
}
