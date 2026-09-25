import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private svc: KitchenService) {}

  @Get('queue')
  getQueue(@CurrentUser() u: any) {
    return this.svc.getQueue(u.restaurantId);
  }
}
