import { NextResponse } from 'next/server';
import { buildRosterBffHeaders } from '@/lib/roster-bff-headers';
import { forwardRosterRequest, getRosterBaseUrl } from '@/lib/roster-forward';

export async function GET(request: Request) {
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

  const requestUrl = new URL(request.url);
  const path = requestUrl.search ? `/v1/prompts${requestUrl.search}` : '/v1/prompts';

  try {
    const out = await forwardRosterRequest({
      baseUrl: base,
      path,
      method: 'GET',
      headers,
    });
    return NextResponse.json(
      {
        success: out.status >= 200 && out.status < 300,
        rosterStatus: out.status,
        rosterContentType: out.contentType,
        path,
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
