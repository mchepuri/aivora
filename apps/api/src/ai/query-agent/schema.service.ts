import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface ForeignKeyRow {
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

@Injectable()
export class SchemaService implements OnModuleInit {
  private readonly logger = new Logger(SchemaService.name);
  private snapshot = '';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      this.snapshot = await this.buildSnapshot();
      this.logger.log('Schema snapshot refreshed');
    } catch (err) {
      this.logger.error('Failed to build schema snapshot', err);
    }
  }

  getSnapshot(): string {
    return this.snapshot;
  }

  async describeTable(tableName: string): Promise<string> {
    if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
      return JSON.stringify({ error: 'Invalid table name.' });
    }
    const columns = await this.prisma.$queryRaw<
      Pick<ColumnRow, 'column_name' | 'data_type' | 'is_nullable'>[]
    >`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    return JSON.stringify({ table: tableName, columns });
  }

  private async buildSnapshot(): Promise<string> {
    const columns = await this.prisma.$queryRaw<ColumnRow[]>`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name NOT LIKE '_prisma_%'
      ORDER BY table_name, ordinal_position
    `;

    const foreignKeys = await this.prisma.$queryRaw<ForeignKeyRow[]>`
      SELECT
        tc.table_name   AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name  AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema    = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema    = 'public'
      ORDER BY tc.table_name
    `;

    const tables = new Map<string, ColumnRow[]>();
    for (const col of columns) {
      if (!tables.has(col.table_name)) tables.set(col.table_name, []);
      tables.get(col.table_name)!.push(col);
    }

    const lines: string[] = ['## Database Schema\n'];
    for (const [table, cols] of tables) {
      lines.push(`Table: ${table}`);
      for (const col of cols) {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
        lines.push(`  ${col.column_name.padEnd(28)} ${col.data_type.padEnd(20)} ${nullable}`);
      }
      lines.push('');
    }

    if (foreignKeys.length > 0) {
      lines.push('## Foreign Keys\n');
      for (const fk of foreignKeys) {
        lines.push(
          `  ${fk.source_table}.${fk.source_column} → ${fk.target_table}.${fk.target_column}`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
