import { Module } from '@nestjs/common';
import { AnotaAiService } from './anota-ai.service';
import { AnotaAiController } from './anota-ai.controller';

@Module({
  providers: [AnotaAiService],
  controllers: [AnotaAiController],
  exports: [AnotaAiService],
})
export class AnotaAiModule {}
