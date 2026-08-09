import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OPENROUTER_TIMEOUT_MS = 5000;

interface ServiceStatus {
  status: 'ok' | 'unreachable';
  latencyMs?: number;
  error?: string;
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const [database, openrouter] = await Promise.all([
      this.checkDatabase(),
      this.checkOpenRouter(),
    ]);

    const allOk = database.status === 'ok' && openrouter.status === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database, openrouter },
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error(
        `Database health check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { status: 'unreachable', error: 'Database query failed' };
    }
  }

  // Hits OpenRouter's key-info endpoint rather than running a completion — it validates
  // network reachability AND that the API key itself is valid (401 if not), without incurring
  // LLM token cost. Note: /models is a tempting alternative but is public and returns 200 even
  // for a garbage key, so it would not catch an expired/revoked OPENROUTER_API_KEY.
  private async checkOpenRouter(): Promise<ServiceStatus> {
    const start = Date.now();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { status: 'unreachable', error: 'OPENROUTER_API_KEY is not set' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      if (!res.ok) {
        return { status: 'unreachable', error: `OpenRouter responded with HTTP ${res.status}` };
      }
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error(
        `OpenRouter health check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      const timedOut = err instanceof Error && err.name === 'AbortError';
      return {
        status: 'unreachable',
        error: timedOut ? 'OpenRouter request timed out' : 'Could not reach OpenRouter',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
