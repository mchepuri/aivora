import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { InventoryBotService } from './inventory-bot.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('ai/inventory-bot')
export class InventoryBotController {
  constructor(private readonly inventoryBotService: InventoryBotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  chat(@Body() dto: ChatMessageDto) {
    return this.inventoryBotService.chat(dto);
  }
}
