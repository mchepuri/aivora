import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller('master-data/items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListItemsDto) {
    return this.itemsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.itemsService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateItemDto, @Request() req: { user: JwtPayload }) {
    return this.itemsService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.itemsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.itemsService.remove(id, req.user.tenantId);
  }
}
