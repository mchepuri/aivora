import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/apiClient';

interface ApiHealth {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: Record<string, { status: 'ok' | 'unreachable'; latencyMs?: number; error?: string }>;
}

// Proxies the API's /health check so hitting this route exercises the full
// web -> api -> (database, openrouter -> LLM) chain in one request.
export async function GET() {
  try {
    const apiHealth = await apiClient.get<ApiHealth>('/health');
    return NextResponse.json(
      { status: apiHealth.status, timestamp: new Date().toISOString(), api: apiHealth },
      { status: apiHealth.status === 'ok' ? 200 : 503 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        api: { status: 'unreachable', error: err instanceof Error ? err.message : 'API unreachable' },
      },
      { status: 503 },
    );
  }
}
