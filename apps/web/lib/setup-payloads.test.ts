import { describe, expect, it } from 'vitest';
import { buildSetupPayload } from './setup-payloads';

describe('buildSetupPayload', () => {
  it('builds Claude Desktop payload', () => {
    const payload = buildSetupPayload('claude');
    expect(payload.title).toMatch(/Claude Desktop/i);
    expect(payload.config).toMatch(/@maslowai\/roster/);
  });

  it('builds Cursor payload', () => {
    const payload = buildSetupPayload('cursor');
    expect(payload.title).toMatch(/Cursor/i);
    expect(payload.steps.length).toBeGreaterThan(1);
  });

  it('builds generic MCP payload', () => {
    const payload = buildSetupPayload('generic');
    expect(payload.summary).toMatch(/MCP/i);
    expect(payload.configLabel).toMatch(/Generic/i);
  });
});

