```bash
set -euo pipefail

# Write sample .cursor/mcp.json entries for Roster MCP (@maslowai/roster)

# 1) File storage (works locally without extra services)
cat > .cursor/mcp.json << 'JSON'
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "file",
        "PROMPTS_DIR": "./prompts",
        "LOG_LEVEL": "info"
      }
    }
  }
}
JSON

echo "Wrote .cursor/mcp.json (file storage)."

# 2) Legacy AWS DynamoDB/S3/SQS path (STORAGE_TYPE not in file|memory|postgres|convex)
cat > .cursor/mcp.aws.json << 'JSON'
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "aws",
        "AWS_REGION": "us-east-1",
        "LOG_LEVEL": "info"
      }
    }
  }
}
JSON

echo "Wrote .cursor/mcp.aws.json (AWS adapters — set PROMPTS_TABLE, PROMPTS_BUCKET, PROCESSING_QUEUE as needed)."

node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.json','utf8')); console.log('OK: mcp.json')"
node -e "JSON.parse(require('fs').readFileSync('.cursor/mcp.aws.json','utf8')); console.log('OK: mcp.aws.json')"

echo "Copy the file you want to .cursor/mcp.json (Convex: see OPERATIONS.md)."
```
