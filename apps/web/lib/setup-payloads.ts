type SetupClient = 'claude' | 'cursor' | 'generic';

type SetupPayload = {
  client: SetupClient;
  title: string;
  summary: string;
  steps: string[];
  configLabel: string;
  config: string;
};

function baseRosterConfig() {
  return {
    mcpServers: {
      roster: {
        command: 'npx',
        args: ['-y', '@maslowai/roster'],
      },
    },
  };
}

export function buildSetupPayload(client: SetupClient): SetupPayload {
  const commonConfig = baseRosterConfig();

  if (client === 'cursor') {
    return {
      client,
      title: 'Cursor MCP setup',
      summary: 'Use Roster as a stdio MCP server inside Cursor with a minimal mcpServers block.',
      steps: [
        'Open Cursor MCP settings or your project-level MCP config.',
        'Paste the JSON snippet into the mcpServers map.',
        'Restart Cursor or reload MCP servers, then verify Roster appears in the tool list.',
      ],
      configLabel: 'cursor-mcp.json',
      config: JSON.stringify(commonConfig, null, 2),
    };
  }

  if (client === 'generic') {
    return {
      client,
      title: 'Generic MCP host setup',
      summary: 'Use the same stdio configuration in any MCP-compatible host that accepts a command, args, and optional env.',
      steps: [
        'Open the MCP settings for your host platform.',
        'Register a server named roster using the snippet below.',
        'Reload the host and run a list_prompts smoke test.',
      ],
      configLabel: 'generic-mcp-config.json',
      config: JSON.stringify(commonConfig, null, 2),
    };
  }

  return {
    client: 'claude',
    title: 'Claude Desktop setup',
    summary: 'Add Roster to Claude Desktop as a local stdio MCP server and verify it from the tool picker.',
    steps: [
      'Open Claude Desktop MCP configuration.',
      'Merge the JSON below into the mcpServers object.',
      'Restart Claude Desktop and verify roster appears as an available MCP server.',
    ],
    configLabel: 'claude_desktop_config.json',
    config: JSON.stringify(commonConfig, null, 2),
  };
}
