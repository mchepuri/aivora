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
import { CreateUomDto } from './dto/create-uom.dto';
import { ListUomDto } from './dto/list-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomService } from './uom.service';

@Controller('master-data/uom')
@UseGuards(JwtAuthGuard)
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListUomDto) {
    return this.uomService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.uomService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUomDto, @Request() req: { user: JwtPayload }) {
    return this.uomService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUomDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.uomService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.uomService.remove(id, req.user.tenantId);
  }
}
