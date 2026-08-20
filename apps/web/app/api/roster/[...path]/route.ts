import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildRosterBffHeaders } from '@/lib/roster-bff-headers';
import { forwardRosterRequest, getRosterBaseUrl } from '@/lib/roster-forward';
import { getLegacyAdvancedRouteAccess } from '@/lib/legacy-advanced-access';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ROOT_SEGMENT_MAP: Record<string, string> = {
  health: '/health',
  mcp: '/mcp',
  prompts: '/v1/prompts',
  'slash-commands': '/v1/slash-commands',
  subagents: '/v1/subagents',
  'main-agents': '/v1/main-agents',
  orchestrate: '/v1/orchestrate',
  subscription: '/v1/subscription',
  payment: '/v1/payment',
  stats: '/v1/stats',
};

function mapRosterPath(path: string[]) {
  const [root, ...rest] = path;
  const mappedRoot = ROOT_SEGMENT_MAP[root];
  if (!mappedRoot) return null;
  if (mappedRoot === '/health' || mappedRoot === '/v1/stats') return mappedRoot;
  if (rest.length === 0) return mappedRoot;
  return `${mappedRoot}/${rest.map(encodeURIComponent).join('/')}`;
}

function buildEnvelope(path: string, out: Awaited<ReturnType<typeof forwardRosterRequest>>) {
  const success = out.status >= 200 && out.status < 300;
  const body =
    typeof out.body === 'object' && out.body && !Array.isArray(out.body)
      ? (out.body as Record<string, unknown>)
      : null;

  return {
    success,
    path,
    rosterStatus: out.status,
    rosterContentType: out.contentType,
    data: out.body,
    error:
      success
        ? undefined
        : typeof body?.error === 'string'
          ? body.error
          : `Roster request failed (${out.status})`,
  };
}

async function handle(request: Request, context: RouteContext) {
  const { path: rawPath } = await context.params;
  const mappedPath = mapRosterPath(rawPath);
  if (!mappedPath) {
    return NextResponse.json(
      {
        success: false,
        rosterStatus: 404,
        error: 'Unsupported roster route',
        data: null,
      },
      { status: 404 },
    );
  }

  const root = rawPath[0] ?? '';
  const requiresAdvancedAccess = root !== 'health';
  if (requiresAdvancedAccess) {
    const access = getLegacyAdvancedRouteAccess(
      await auth(),
      process.env.ROSTER_LEGACY_ADVANCED_ENABLED,
    );
    if (!access.allowed) {
      return NextResponse.json(
        {
          success: false,
          rosterStatus: access.status,
          error: access.error,
          data: null,
        },
        { status: access.status },
      );
    }
  }

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
  const fullPath = requestUrl.search ? `${mappedPath}${requestUrl.search}` : mappedPath;

  try {
    const body = request.method === 'GET' ? undefined : await request.json().catch(() => undefined);
    const out = await forwardRosterRequest({
      baseUrl: base,
      path: fullPath,
      method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      headers,
      body,
    });
    return NextResponse.json(buildEnvelope(fullPath, out), { status: out.status });
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

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
