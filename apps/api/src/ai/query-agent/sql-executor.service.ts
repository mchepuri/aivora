import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const FORBIDDEN_RE =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE|CREATE|REPLACE|EXEC|EXECUTE|UNION|INTERSECT|EXCEPT|INTO)\b|--|\/\*/i;
const LIMIT_RE = /\bLIMIT\b/i;
const MAX_ROWS = 500;

@Injectable()
export class SqlExecutorService {
  private readonly logger = new Logger(SqlExecutorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: string,
    tenantId: string,
  ): Promise<{ rows: unknown[]; rowCount: number }> {
    const q = query.trim();

    if (!q.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are permitted.');
    }

    if (FORBIDDEN_RE.test(q)) {
      throw new Error('Query contains a forbidden SQL keyword.');
    }

    // Column is "tenantId" (camelCase, Prisma-generated). Accept both quoted and unquoted forms.
    if (!q.toLowerCase().includes('tenantid')) {
      throw new Error('Query must include a "tenantId" filter.');
    }

    const escapedId = tenantId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tenantPattern = new RegExp(`"?tenantId"?\\s*=\\s*'${escapedId}'`, 'i');
    if (!tenantPattern.test(q)) {
      throw new Error('Query "tenantId" value does not match the authenticated tenant.');
    }

    const safe = LIMIT_RE.test(q) ? q : `${q} LIMIT ${MAX_ROWS}`;
    this.logger.debug(`Executing: ${safe.slice(0, 200)}`);

    const rows = await this.prisma.$queryRawUnsafe<unknown[]>(safe);
    return { rows, rowCount: rows.length };
  }
}
