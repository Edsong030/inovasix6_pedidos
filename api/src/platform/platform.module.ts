import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  providers: [PlatformService, PlatformAdminGuard],
  controllers: [PlatformController],
})
export class PlatformModule {}
