import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  /** Configurações do estabelecimento do usuário logado (somente dados públicos). */
  @Get('settings')
  @ApiOperation({ summary: 'Configurações do estabelecimento do usuário logado' })
  settings(@CurrentUser() u: { restaurantId: string }) {
    return this.svc.getSettings(u.restaurantId);
  }

  /** Atualização parcial. O tipo de negócio só pode ser trocado pelo ADMIN. */
  @Patch('settings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Atualiza as configurações do estabelecimento (ADMIN/MANAGER)' })
  updateSettings(
    @CurrentUser() u: { restaurantId: string; role: UserRole },
    @Body() dto: UpdateRestaurantSettingsDto,
  ) {
    return this.svc.updateSettings(u.restaurantId, u.role, dto);
  }
}
