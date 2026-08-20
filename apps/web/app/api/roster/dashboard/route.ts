import { NextResponse } from 'next/server';
import { buildRosterBffHeaders } from '@/lib/roster-bff-headers';
import { forwardRosterRequest, getRosterBaseUrl } from '@/lib/roster-forward';

async function read(baseUrl: string, path: string, headers: HeadersInit) {
  try {
    const out = await forwardRosterRequest({ baseUrl, path, headers, method: 'GET' });
    return {
      success: out.status >= 200 && out.status < 300,
      status: out.status,
      data: out.body,
      contentType: out.contentType,
    };
  } catch (error) {
    return {
      success: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Upstream error',
      data: null,
      contentType: 'application/json',
    };
  }
}

export async function GET() {
  const base = getRosterBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        success: false,
        rosterStatus: 503,
        error: 'ROSTER_HTTP_URL is not configured',
        data: null,
      },
      { status: 503 },
    );
  }

  const headers = await buildRosterBffHeaders();
  if ('error' in headers && headers.error === 'unauthorized') {
    return NextResponse.json(
      {
        success: false,
        rosterStatus: 401,
        error: 'Unauthorized',
        data: null,
      },
      { status: 401 },
    );
  }

  const [health, tools, stats, runs, subscription] = await Promise.all([
    read(base, '/health', headers),
    read(base, '/mcp/tools', headers),
    read(base, '/v1/stats', headers),
    read(base, '/v1/orchestrate?limit=6', headers),
    read(base, '/v1/subscription/status', headers),
  ]);

  return NextResponse.json({
    success: true,
    rosterStatus: 200,
    data: {
      health,
      tools,
      stats,
      runs,
      subscription,
    },
  });
}

