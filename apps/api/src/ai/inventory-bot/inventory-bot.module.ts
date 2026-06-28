import { Module } from '@nestjs/common';
import { UomModule } from '../../master-data/uom/uom.module';
import { InventoryBotController } from './inventory-bot.controller';
import { InventoryBotService } from './inventory-bot.service';

@Module({
  imports: [UomModule],
  controllers: [InventoryBotController],
  providers: [InventoryBotService],
})
export class InventoryBotModule {}
