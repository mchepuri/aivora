import { LogLevel } from '@nestjs/common';

const DEFAULT_LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error'];
const DEBUG_LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'debug', 'verbose'];

export function resolveLogLevels(): LogLevel[] {
  return (process.env.LOG_LEVEL ?? '').toLowerCase() === 'debug'
    ? DEBUG_LOG_LEVELS
    : DEFAULT_LOG_LEVELS;
}
