import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = unknown>(err: unknown, user: TUser | false, info: unknown, context: ExecutionContext): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request>();
      const reason = err instanceof Error ? err.message : (info instanceof Error ? info.message : String(info));
      this.logger.debug(
        `JWT auth rejected — ${req.method} ${req.originalUrl}: ${reason}, ` +
          `hasCookie=${Boolean(req.cookies?.['aivora_token'])}, hasAuthHeader=${Boolean(req.headers.authorization)}`,
      );
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    return user;
  }
}
