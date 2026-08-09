import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const mockUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: bcrypt.hashSync('correct-password', 1),
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [],
};

function makePrismaError(code: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', { code, clientVersion: '5.0.0' });
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('returns accessToken and safe user on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login('test@example.com', 'correct-password');

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', 'any')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user has no passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.login('test@example.com', 'any')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      name: 'Jane Cooper',
      email: 'jane@example.com',
      password: 'securepassword',
    };

    it('returns accessToken and user without passwordHash on success', async () => {
      const created = {
        id: 'new-user-id',
        tenantId: 'new-tenant-id',
        email: registerDto.email,
        name: registerDto.name,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(created);

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe('signed-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.tenantId).toBe(created.tenantId);
    });

    it('throws ConflictException when email is already registered', async () => {
      prisma.user.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });
});
