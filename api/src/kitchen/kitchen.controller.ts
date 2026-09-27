import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { KITCHEN_ROLES } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Kitchen')
@ApiCookieAuth('inx_session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private svc: KitchenService) {}

  /** Fila da produção: ADMIN, MANAGER, KITCHEN e ATTENDANT (coordena balcão/salão). */
  @Get('queue')
  @Roles(...KITCHEN_ROLES)
  getQueue(@CurrentUser() u: any) {
    return this.svc.getQueue(u.restaurantId);
  }
}
