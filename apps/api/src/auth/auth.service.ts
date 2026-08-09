import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId };
    const accessToken = this.jwt.sign(payload);

    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const tenantId = randomUUID();
    let user;
    try {
      user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, passwordHash, tenantId },
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw e;
    }
    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId };
    const accessToken = this.jwt.sign(payload);
    const { passwordHash: _, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }
}
