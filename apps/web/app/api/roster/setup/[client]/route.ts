import { NextResponse } from 'next/server';
import { buildSetupPayload } from '@/lib/setup-payloads';

type RouteContext = {
  params: Promise<{ client: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { client } = await context.params;

  if (client !== 'claude' && client !== 'cursor' && client !== 'generic') {
    return NextResponse.json(
      {
        success: false,
        rosterStatus: 404,
        error: 'Unsupported setup client',
        data: null,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    rosterStatus: 200,
    data: buildSetupPayload(client),
  });
}

