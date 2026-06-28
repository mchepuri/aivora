import { Module } from '@nestjs/common';
import { SodRulesModule } from '../sod-rules/sod-rules.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SodRulesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
