import { Module } from '@nestjs/common';
import { SodRulesController } from './sod-rules.controller';
import { SodRulesService } from './sod-rules.service';

@Module({
  controllers: [SodRulesController],
  providers: [SodRulesService],
  exports: [SodRulesService],
})
export class SodRulesModule {}
