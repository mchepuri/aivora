import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUserDto';
import { UpdateUserDto } from './dto/updateUserDto';
import { AssignRolesDto } from './dto/assignRolesDto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, tenantId, updateUserDto);
  }

  @Put(':id/roles')
  assignRoles(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() assignRolesDto: AssignRolesDto,
  ) {
    return this.usersService.assignRoles(id, tenantId, assignRolesDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }
}
