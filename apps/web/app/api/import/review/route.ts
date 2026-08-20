import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { extractReviewText } from '@/lib/review-import';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a file to review.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Files must be 10 MB or smaller.' }, { status: 413 });
  }
  try {
    const result = await extractReviewText(
      file.name,
      file.type,
      new Uint8Array(await file.arrayBuffer()),
    );
    return NextResponse.json({ ...result, fileName: file.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Roster could not read this file.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
