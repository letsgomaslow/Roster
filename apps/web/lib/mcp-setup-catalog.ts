export type McpSetupCategory = 'connect_myself' | 'ask_admin' | 'build_deploy' | 'limited';
export type McpSetupPayload = 'claude' | 'generic' | null;
export type McpVerification = 'Live tested' | 'Docs verified' | 'Limited';

export type McpSetupClient = {
  id:
    | 'claude'
    | 'codex'
    | 'gemini-cli'
    | 'chatgpt-managed'
    | 'microsoft-copilot'
    | 'gemini-workspace'
    | 'generic';
  name: string;
  category: McpSetupCategory;
  verification: McpVerification;
  lastVerifiedAt: string;
  summary: string;
  authority: string;
  transport: string;
  setupPayload: McpSetupPayload;
  officialDocs: string;
  steps: readonly string[];
};

const LAST_VERIFIED_AT = '2026-08-20';

export const MCP_SETUP_CLIENTS = [
  {
    id: 'claude',
    name: 'Claude',
    category: 'connect_myself',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Connect your Roster workspace as a custom remote connector.',
    authority: 'You can connect this yourself on supported individual plans.',
    transport: 'Streamable HTTP with workspace sign-in',
    setupPayload: 'claude',
    officialDocs: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
    steps: [
      'Copy your workspace connection URL from Roster.',
      'Open Claude connector settings and add a custom connector.',
      'Authorize your Maslow AI workspace, then test an approved asset search.',
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    category: 'connect_myself',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Add Roster as a remote MCP server in your Codex configuration.',
    authority: 'You can configure this in your own Codex environment.',
    transport: 'Streamable HTTP',
    setupPayload: 'generic',
    officialDocs: 'https://developers.openai.com/codex/mcp/',
    steps: [
      'Copy the Roster workspace endpoint.',
      'Add it as a remote MCP server in Codex.',
      'Sign in when prompted, then verify search_assets and get_asset.',
    ],
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    category: 'connect_myself',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Register the Roster endpoint as an MCP server in Gemini CLI.',
    authority: 'You can configure this in your own CLI environment.',
    transport: 'MCP client configuration',
    setupPayload: 'generic',
    officialDocs: 'https://geminicli.com/docs/tools/mcp-server/',
    steps: [
      'Copy the Roster workspace endpoint.',
      'Add the endpoint to your Gemini CLI MCP settings.',
      'Authorize the workspace and verify an approved library search.',
    ],
  },
  {
    id: 'chatgpt-managed',
    name: 'ChatGPT Business, Enterprise, or Edu',
    category: 'ask_admin',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'A ChatGPT workspace administrator must allow and publish the custom MCP app.',
    authority: 'Workspace administrator required',
    transport: 'Remote MCP app',
    setupPayload: null,
    officialDocs: 'https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt',
    steps: [
      'Send the prepared Roster connection request to your ChatGPT administrator.',
      'The administrator reviews permissions and enables the app.',
      'After publication, connect Roster from your ChatGPT workspace.',
    ],
  },
  {
    id: 'microsoft-copilot',
    name: 'Microsoft 365 Copilot',
    category: 'build_deploy',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Use an administrator-led declarative agent or Copilot Studio deployment path.',
    authority: 'Microsoft 365 or Copilot Studio administrator required',
    transport: 'MCP plugin through a managed agent',
    setupPayload: null,
    officialDocs: 'https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/build-mcp-plugins',
    steps: [
      'Choose the declarative agent or Copilot Studio deployment path.',
      'Register the Roster MCP endpoint and requested tools.',
      'Review permissions, deploy to a test group, then publish to approved users.',
    ],
  },
  {
    id: 'gemini-workspace',
    name: 'Gemini Workspace',
    category: 'limited',
    verification: 'Limited',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Normal Gemini Workspace accounts do not have a universal direct custom MCP path.',
    authority: 'Availability depends on the Gemini product and administrator path.',
    transport: 'Product-specific custom app path',
    setupPayload: null,
    officialDocs: 'https://support.google.com/gemini/answer/17209137',
    steps: [
      'Confirm which Gemini product and plan your workspace uses.',
      'Ask an administrator whether custom apps are available.',
      'Use Roster copy/export while a supported connection path is unavailable.',
    ],
  },
  {
    id: 'generic',
    name: 'Other MCP client',
    category: 'connect_myself',
    verification: 'Docs verified',
    lastVerifiedAt: LAST_VERIFIED_AT,
    summary: 'Connect any conforming client that supports remote Streamable HTTP servers.',
    authority: 'Depends on the client and your organization policy.',
    transport: 'Streamable HTTP',
    setupPayload: 'generic',
    officialDocs: 'https://modelcontextprotocol.io/specification/2025-06-18/basic/transports',
    steps: [
      'Confirm the client supports remote Streamable HTTP MCP servers.',
      'Add the Roster workspace endpoint and complete authorization.',
      'Verify search_assets before enabling additional tools.',
    ],
  },
] as const satisfies readonly McpSetupClient[];

export function getMcpSetupClient(id: McpSetupClient['id']): McpSetupClient {
  const client = MCP_SETUP_CLIENTS.find((item) => item.id === id);
  if (!client) throw new Error(`Unknown MCP setup client: ${id}`);
  return client;
}
