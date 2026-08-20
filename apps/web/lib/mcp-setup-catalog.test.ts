import { describe, expect, it } from 'vitest';
import { MCP_SETUP_CLIENTS, getMcpSetupClient } from './mcp-setup-catalog';

describe('MCP setup catalog', () => {
  it('covers the cross-tool clients named in the Roster product direction', () => {
    expect(MCP_SETUP_CLIENTS.map((client) => client.name)).toEqual([
      'Claude',
      'Codex',
      'Gemini CLI',
      'ChatGPT Business, Enterprise, or Edu',
      'Microsoft 365 Copilot',
      'Gemini Workspace',
      'Other MCP client',
    ]);
  });

  it('does not imply direct custom MCP support for normal Gemini Workspace accounts', () => {
    expect(getMcpSetupClient('gemini-workspace')).toMatchObject({
      category: 'limited',
      setupPayload: null,
      verification: 'Limited',
    });
  });

  it('routes managed ChatGPT connections through an administrator', () => {
    expect(getMcpSetupClient('chatgpt-managed')).toMatchObject({
      category: 'ask_admin',
      setupPayload: null,
    });
  });

  it('does not claim a live client test until that connection has been exercised', () => {
    expect(getMcpSetupClient('claude').verification).toBe('Docs verified');
  });

  it('provides a maintained source and verification date for every guide', () => {
    for (const client of MCP_SETUP_CLIENTS) {
      expect(client.officialDocs).toMatch(/^https:\/\//);
      expect(client.lastVerifiedAt).toBe('2026-08-20');
    }
  });
});
