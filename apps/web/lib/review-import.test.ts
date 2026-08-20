import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { extractReviewText } from './review-import';

function simpleDocx(text: string): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    'word/document.xml': strToU8(
      `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
    ),
  });
}

describe('extractReviewText', () => {
  it('keeps text imports exact for human review', async () => {
    const result = await extractReviewText('prompt.md', 'text/markdown', strToU8('Exact {{prompt}}'));
    expect(result).toEqual({ fileType: 'markdown', text: 'Exact {{prompt}}', warnings: [] });
  });

  it('extracts readable DOCX content without publishing it', async () => {
    const result = await extractReviewText(
      'notes.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      simpleDocx('Discovery notes for Acme'),
    );
    expect(result.text).toContain('Discovery notes for Acme');
    expect(result.fileType).toBe('docx');
  });

  it('rejects unsupported and oversized inputs before parsing', async () => {
    await expect(extractReviewText('data.csv', 'text/csv', strToU8('a,b'))).rejects.toThrow(
      /supported/i,
    );
    await expect(
      extractReviewText('large.txt', 'text/plain', new Uint8Array(10 * 1024 * 1024 + 1)),
    ).rejects.toThrow(/10 MB/i);
  });
});
