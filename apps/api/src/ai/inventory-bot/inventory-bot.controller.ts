import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { ChatMessageDto } from './dto/chat-message.dto';
import { InventoryBotService } from './inventory-bot.service';

@Controller('ai/inventory-bot')
export class InventoryBotController {
  constructor(private readonly inventoryBotService: InventoryBotService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  chat(@Body() dto: ChatMessageDto, @Request() req: { user: JwtPayload }) {
    return this.inventoryBotService.chat(dto, req.user.tenantId);
  }
}
