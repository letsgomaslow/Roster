import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 500_000;

export type ReviewImportResult = {
  fileType: 'text' | 'markdown' | 'docx' | 'pdf';
  text: string;
  warnings: string[];
};

function fileTypeFor(fileName: string, mimeType: string): ReviewImportResult['fileType'] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'md' || mimeType === 'text/markdown') return 'markdown';
  if (extension === 'txt' || mimeType === 'text/plain') return 'text';
  if (extension === 'docx') return 'docx';
  if (extension === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  throw new Error('Supported imports are TXT, Markdown, DOCX, and PDF.');
}

async function extractDocx(bytes: Uint8Array): Promise<ReviewImportResult> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return {
    fileType: 'docx',
    text: result.value,
    warnings: result.messages.map((message) => message.message),
  };
}

async function extractPdf(bytes: Uint8Array): Promise<ReviewImportResult> {
  const document = await getDocumentProxy(Uint8Array.from(bytes));
  try {
    const result = await extractText(document, { mergePages: true });
    return { fileType: 'pdf', text: result.text, warnings: [] };
  } finally {
    const destroyable = document as typeof document & { destroy?: () => void | Promise<void> };
    await destroyable.destroy?.();
  }
}

function validateResult(result: ReviewImportResult): ReviewImportResult {
  if (!result.text.trim()) throw new Error('Roster could not find readable text in this file.');
  if (result.text.length > MAX_TEXT_CHARACTERS) {
    throw new Error('The extracted text is too long to review safely in one prompt.');
  }
  return result;
}

export async function extractReviewText(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<ReviewImportResult> {
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('Files must be 10 MB or smaller.');
  const fileType = fileTypeFor(fileName, mimeType);
  if (fileType === 'docx') return validateResult(await extractDocx(bytes));
  if (fileType === 'pdf') return validateResult(await extractPdf(bytes));
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return validateResult({ fileType, text, warnings: [] });
}
