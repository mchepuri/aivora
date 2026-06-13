import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UomController } from './uom.controller';
import { UomService } from './uom.service';

@Module({
  imports: [PrismaModule],
  controllers: [UomController],
  providers: [UomService],
  exports: [UomService],
})
export class UomModule {}
