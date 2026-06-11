# New API Endpoint

Scaffold a new NestJS module with controller, service, DTOs, and Prisma integration for the Aivora API.

## Instructions

Ask the user for:
1. **Resource name** (singular, PascalCase) — e.g. `Invoice`, `Project`, `Team`
2. **Operations needed** — which of: list (GET /), get-by-id (GET /:id), create (POST /), update (PATCH /:id), delete (DELETE /:id)
3. **Prisma model fields** — what data the resource holds
4. **Auth requirements** — is every endpoint protected by JWT guard? Any public endpoints?

Then generate the full module following these rules:

### File layout
```
apps/api/src/{resource-plural}/
  {resource-plural}.module.ts
  {resource-plural}.controller.ts
  {resource-plural}.service.ts
  dto/
    create-{resource}.dto.ts
    update-{resource}.dto.ts    (only if update operation needed)
```

### Module
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
```

### Controller rules
- Use `@Controller('resources')` (plural, kebab-case)
- Protect all routes with `@UseGuards(JwtAuthGuard)` at class level unless a route is explicitly public
- Inject user from request with `@Req() req: AuthRequest` — type `AuthRequest` extends `Request` with `user: { id: string; email: string }`
- Use `@HttpCode(HttpStatus.NO_CONTENT)` on DELETE
- Return data directly — no wrapper objects like `{ data: ... }`

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../auth/auth.types';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.resourcesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.resourcesService.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateResourceDto, @Req() req: AuthRequest) {
    return this.resourcesService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto, @Req() req: AuthRequest) {
    return this.resourcesService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.resourcesService.remove(id, req.user.id);
  }
}
```

### Service rules
- Always scope queries to `userId` (or `orgId`) — never expose cross-tenant data
- Map Prisma errors explicitly — never let raw Prisma errors bubble to the HTTP layer
- Import `PrismaClientKnownRequestError` from `@prisma/client/runtime/library` (not from `Prisma` namespace — it was removed in Prisma v5)
- Throw `NotFoundException` when a record is not found (P2025) or when the query returns null

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateResourceDto } from './dto/create-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.resource.findMany({ where: { userId } });
  }

  async findOne(id: string, userId: string) {
    const record = await this.prisma.resource.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('Resource not found');
    return record;
  }

  async create(dto: CreateResourceDto, userId: string) {
    try {
      return await this.prisma.resource.create({ data: { ...dto, userId } });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Resource already exists');
      }
      throw e;
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // ownership check
    await this.prisma.resource.delete({ where: { id } });
  }
}
```

### DTO rules
- Use `class-validator` decorators for all fields
- All fields required by default; optional fields use `@IsOptional()` + `?` suffix
- No `any` types
- Use `PartialType` from `@nestjs/mapped-types` for UpdateDto

```typescript
// create-resource.dto.ts
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

// update-resource.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateResourceDto } from './create-resource.dto';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

### Register in AppModule
After generating files, remind the user to add the new module to `apps/api/src/app.module.ts` imports array.

### Final checklist
- [ ] All queries scoped to `userId` / `orgId` — no cross-tenant leakage
- [ ] `PrismaClientKnownRequestError` imported from `@prisma/client/runtime/library`
- [ ] P2025 → `NotFoundException`, P2002 → `ConflictException`
- [ ] DTO fields typed — no `any`, definite assignment assertions (`!`) on required fields
- [ ] `UpdateDto` uses `PartialType`
- [ ] Module registered in `AppModule`
