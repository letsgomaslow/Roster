import { NextResponse } from 'next/server';
import { buildRosterBffHeaders } from '@/lib/roster-bff-headers';
import { forwardRosterGet, getRosterBaseUrl } from '@/lib/roster-forward';

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

  try {
    const out = await forwardRosterGet(base, '/health', headers);
    return NextResponse.json(
      {
        success: out.status >= 200 && out.status < 300,
        rosterStatus: out.status,
        rosterContentType: out.contentType,
        path: '/health',
        data: out.body,
      },
      { status: out.status },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        rosterStatus: 502,
        error: error instanceof Error ? error.message : 'Upstream error',
        rosterUnreachable: true,
        data: null,
      },
      { status: 502 },
    );
  }
}

