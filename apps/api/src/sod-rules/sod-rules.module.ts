import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SodRulesController } from './sod-rules.controller';
import { SodRulesService } from './sod-rules.service';

@Module({
  imports: [AuthModule],
  controllers: [SodRulesController],
  providers: [SodRulesService],
  exports: [SodRulesService],
})
export class SodRulesModule {}
