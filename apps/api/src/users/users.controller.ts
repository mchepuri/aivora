import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUserDto';
import { UpdateUserDto } from './dto/updateUserDto';
import { AssignRolesDto } from './dto/assignRolesDto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto, @Request() req: { user: JwtPayload }) {
    return this.usersService.create(dto, req.user.tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, req.user.tenantId, updateUserDto);
  }

  @Put(':id/roles')
  assignRoles(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
    @Body() assignRolesDto: AssignRolesDto,
  ) {
    return this.usersService.assignRoles(id, req.user.tenantId, assignRolesDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.usersService.remove(id, req.user.tenantId);
  }
}
