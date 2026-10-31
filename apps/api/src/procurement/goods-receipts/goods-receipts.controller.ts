import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CreateGoodsReceiptNoteDto } from './dto/create-goods-receipt-note.dto';
import { ListGoodsReceiptNotesDto } from './dto/list-goods-receipt-notes.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

// No PATCH route — a DRAFT GRN is created whole and deleted if wrong; a
// POSTED one is corrected via POST :id/reverse, never edited (see the model
// comment on GoodsReceiptNote in schema.prisma).
@Controller('procurement/goods-receipts')
@UseGuards(JwtAuthGuard)
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListGoodsReceiptNotesDto) {
    return this.goodsReceiptsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.goodsReceiptsService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateGoodsReceiptNoteDto, @Request() req: { user: JwtPayload }) {
    return this.goodsReceiptsService.create(dto, req.user.tenantId, req.user.sub);
  }

  @Post(':id/post')
  post(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.goodsReceiptsService.post(id, req.user.tenantId, req.user.sub);
  }

  @Post(':id/reverse')
  reverse(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.goodsReceiptsService.reverse(id, req.user.tenantId, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.goodsReceiptsService.remove(id, req.user.tenantId);
  }
}
