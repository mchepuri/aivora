import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
}

function cookieOrBearerExtractor(req: Request): string | null {
  const fromCookie = req?.cookies?.['aivora_token'] ?? null;
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');

    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.email || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    // Validates UUID format to prevent prompt-injection via malformed tenantId
    // values being interpolated into the AI agent system prompt.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.tenantId)) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
