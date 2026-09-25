import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';

@Module({
  providers: [KitchenService],
  controllers: [KitchenController],
})
export class KitchenModule {}
