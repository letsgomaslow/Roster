# Roster MCP

**Prompt management MCP server by [Maslow AI](https://www.npmjs.com/org/maslowai).**

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@maslowai/roster)](https://www.npmjs.com/package/@maslowai/roster)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.18-green)](https://modelcontextprotocol.io/)

A production-ready [Model Context Protocol](https://modelcontextprotocol.io/) server for managing, versioning, and serving prompts and templates for LLM applications—with **file**, **memory**, **PostgreSQL**, **Convex** (hosted), and optional **AWS** (DynamoDB, S3, SQS) storage.

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Convex (hosted)](#convex-hosted-storage) • [Configuration](#configuration) • [Operations](OPERATIONS.md) • [Docker](#docker)

</div>

## Overview

**Roster MCP** runs as an MCP server (stdio) or HTTP API. It provides tools to list, fetch, create, update, and template prompts, with pluggable storage. Use **Convex** for a managed online backend (see [OPERATIONS.md](OPERATIONS.md)), or local **file** / **memory** for development.

### Key Capabilities

- **Prompt management**: List, get, create, update, delete, apply templates, stats
- **Template system**: Variable substitution with validation (`{{variableName}}`)
- **Search & discovery**: Tags, categories, and text search (per adapter)
- **Storage**: `file`, `memory`, `postgres`, `convex` (see [docs/03-storage-adapters.md](docs/03-storage-adapters.md))
- **AWS (optional)**: DynamoDB, S3, SQS for serverless deployments
- **Auth (Convex)**: Clerk JWT integration or dev owner mode ([OPERATIONS.md](OPERATIONS.md))
- **Multi-mode**: MCP stdio or HTTP REST
- **Docker**: Multiple image variants

## Cognitive Architecture 🧠

Roster implements a **seven-layer cognitive architecture** that transforms the system into an intelligent development assistant capable of learning from experience and adapting to different domains.

### Seven Cognitive Layers

```
┌─────────────────────────────────────────┐
│ 7. Evaluative    │ Quality Assessment   │
│                  │ Priority Judgment    │
├─────────────────────────────────────────┤
│ 6. Transfer      │ Cross-Domain Analogies│
│                  │ Pattern Abstraction  │
├─────────────────────────────────────────┤
│ 5. Meta-Cognitive│ Strategy Selection   │
│                  │ Self-Awareness       │
├─────────────────────────────────────────┤
│ 4. Procedural    │ Workflows & Techniques│
│                  │ Analysis Procedures  │
├─────────────────────────────────────────┤
│ 3. Semantic      │ Domain Knowledge     │
│                  │ Tool Capabilities    │
├─────────────────────────────────────────┤
│ 2. Episodic      │ Problem-Solving      │
│                  │ Experience Memory    │
├─────────────────────────────────────────┤
│ 1. Perceptual    │ Context Detection    │
│                  │ Goal Identification  │
└─────────────────────────────────────────┘
```

### Intelligent Prompt Management

- **Context-Aware**: Automatically detects project types and applies relevant knowledge
- **Experience Learning**: Captures successful problem-solving patterns for reuse
- **Cross-Domain Transfer**: Applies patterns learned in one domain to others
- **Self-Improving**: Learns from usage patterns to improve recommendations

### FlatBuffers Integration

High-performance binary serialization for cognitive data:

- **Zero-copy deserialization** for maximum speed
- **Schema evolution** supporting backward compatibility
- **Inter-server communication** with minimal overhead
- **Embedded optimization** for resource-constrained environments

## Features

### Core Features

- ✅ **MCP Protocol Support**: Full implementation of MCP 1.18 specification
- 🔧 **Storage backends**: `memory`, `file`, `postgres`, `convex`, plus AWS when configured
- 📝 **Prompt Templates**: Advanced variable substitution and validation
- 🔍 **Advanced Search**: Category, tag, and content-based search
- 🔒 **Security**: Helmet, CORS, rate limiting, and authentication
- 📊 **Monitoring**: CloudWatch metrics and structured logging
- 💳 **Payment Processing**: Stripe integration with webhook support
- 🌐 **REST API**: Optional HTTP server mode for web integrations
- 🐳 **Docker Ready**: Multiple Dockerfile variants for different use cases

### MCP Tools

The server exposes the following MCP tools:

#### Prompt tools (MCP)

- `list_prompts` — List prompts with optional filters
- `get_prompt` — Fetch a prompt by name/id
- `search_prompts` — Search prompts
- `create_prompt` — Create a prompt
- `update_prompt` — Update a prompt
- `delete_prompt` — Delete a prompt
- `apply_template` — Apply variables to template text
- `get_stats` — Stats about the prompt store
- Slash-command helpers: `slash_command`, `list_slash_commands`, `suggest_slash_commands`

#### Template System

Templates support variable substitution with the `{{variableName}}` syntax:

```markdown
Please review this {{language}} code for:

- Security issues
- Performance improvements
- Best practices

Code:
{{code}}
```

## Installation

### NPM Package

```bash
npm install @maslowai/roster
# or
pnpm add @maslowai/roster
# or
yarn add @maslowai/roster
```

### Global CLI

```bash
npm install -g @maslowai/roster
roster --help
```

The npm package also ships legacy bin names (`mcp-prompts`, `mcp-prompts-server`, `mcp-prompts-http`) pointing at the same entrypoints for backward compatibility.

### Docker

```bash
docker pull ghcr.io/roster/roster:latest
```

## Quick Start

### As MCP Server (stdio)

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "roster": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"]
    }
  }
}
```

Or using Docker:

```json
{
  "mcpServers": {
    "roster": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "${HOME}/.roster-mcp:/app/data",
        "ghcr.io/roster/roster:mcp"
      ]
    }
  }
}
```

### As HTTP Server

```bash
# Using npm
npm install @maslowai/roster
MODE=http PORT=3000 node node_modules/@maslowai/roster/dist/index.js

# Using Docker
docker run -p 3000:3000 -e MODE=http ghcr.io/roster/roster:latest
```

### Using CLI

```bash
# Start in MCP mode
roster start --mode mcp

# Start HTTP server
roster start --mode http --port 3000

# List prompts
roster list

# Get a prompt
roster get <prompt-id>

# Create a prompt
roster create \
  --name "Code Review" \
  --template "Review this {{language}} code..." \
  --category development \
  --tags "code-review,development"

# Search prompts
roster search "bug fix"

# Check health
roster health
```

## Convex (hosted storage)

For a **managed online** prompt store, use **Convex**:

1. Create a Convex project and deploy the `convex/` functions from this repo.
2. Set `STORAGE_TYPE=convex` and `CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud`.
3. Configure **either** Clerk (JWT) **or** dev owner mode for authentication—see the full runbook:

**[OPERATIONS.md](OPERATIONS.md)** — Convex env vars, Clerk setup, bulk import from `data/prompts`, and MCP/HTTP startup examples.

## Configuration

### Environment Variables

#### Core Settings

```bash
# Server mode: 'mcp' for stdio or 'http' for REST API
MODE=mcp

# HTTP server settings (when MODE=http)
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Storage: file | memory | postgres | convex (see docs/02-configuration.md)
STORAGE_TYPE=file

# Convex (when STORAGE_TYPE=convex)
# CONVEX_URL=https://....convex.cloud
# Plus Clerk or CONVEX_DEV_OWNER_USER_ID — see OPERATIONS.md

# Logging
LOG_LEVEL=info
```

#### AWS configuration (DynamoDB / S3 / SQS path)

Used when `STORAGE_TYPE` is set to anything other than `file`, `memory`, `postgres`, or `convex` (see `src/index.ts`). Default **resource names** below are historical identifiers, not the product name:

```bash
AWS_REGION=us-east-1
PROMPTS_TABLE=mcp-prompts
PROMPTS_BUCKET=mcp-prompts-catalog
PROCESSING_QUEUE=mcp-prompts-processing
USERS_TABLE=mcp-prompts-users

# AWS credentials (use IAM roles in production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Payment Integration (Optional)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Storage Backends

#### Memory

```bash
STORAGE_TYPE=memory
```

#### File (local JSON prompts)

```bash
STORAGE_TYPE=file
PROMPTS_DIR=./data/prompts
```

#### PostgreSQL

`STORAGE_TYPE=postgres` is not wired in the current HTTP entrypoint; use `file`, `memory`, `convex`, or the AWS/DynamoDB path.

#### Convex (hosted)

See [Convex (hosted storage)](#convex-hosted-storage) and [OPERATIONS.md](OPERATIONS.md).

#### AWS (DynamoDB + S3 + SQS)

Set `STORAGE_TYPE` to a value outside `file`/`memory`/`postgres`/`convex` per server wiring, or follow deployment docs for your environment:

```bash
AWS_REGION=us-east-1
PROMPTS_TABLE=mcp-prompts
PROMPTS_BUCKET=mcp-prompts-catalog
```

## API

### HTTP Endpoints (when MODE=http)

#### Health & Status

```
GET  /health                      - Health check
GET  /mcp                          - MCP capabilities
GET  /mcp/tools                    - List available MCP tools
POST /mcp/tools                    - Execute an MCP tool
```

#### Prompts API

```
GET    /v1/prompts                 - List prompts
GET    /v1/prompts/:id             - Get specific prompt
POST   /v1/prompts                 - Create new prompt
PUT    /v1/prompts/:id             - Update prompt
DELETE /v1/prompts/:id             - Delete prompt
POST   /v1/prompts/:id/apply       - Apply template variables
```

#### Slash Commands

```
GET  /v1/slash-commands            - List available slash commands
GET  /v1/slash-commands/suggest    - Get command suggestions
POST /v1/slash-commands/execute    - Execute a slash command
```

#### Subscriptions & Payments

```
GET  /v1/subscription/plans        - Get subscription plans
GET  /v1/subscription/status       - Get user subscription status
POST /v1/payment/create-intent     - Create payment intent
POST /v1/subscription/create       - Create subscription
POST /v1/subscription/cancel       - Cancel subscription
POST /v1/webhook/stripe            - Stripe webhook handler
```

### Example API Usage

#### Create a Prompt

```bash
curl -X POST http://localhost:3000/v1/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bug Analyzer",
    "content": "Analyze this bug: {{description}}",
    "isTemplate": true,
    "tags": ["debugging", "analysis"],
    "variables": [
      {
        "name": "description",
        "description": "Bug description",
        "required": true,
        "type": "string"
      }
    ],
    "metadata": {
      "category": "debugging"
    }
  }'
```

#### List Prompts

```bash
# List all prompts
curl http://localhost:3000/v1/prompts

# Filter by category
curl http://localhost:3000/v1/prompts?category=development&limit=10

# Search
curl http://localhost:3000/v1/prompts?search=code%20review
```

#### Apply Template

```bash
curl -X POST http://localhost:3000/v1/prompts/bug_analyzer/apply \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "description": "Login page crashes on mobile devices"
    }
  }'
```

## Available Tools

### MCP Tools Reference

When connected to an MCP client, the following tools are available:

#### `add_prompt`

Create a new prompt.

**Parameters:**

- `name` (string, required): Prompt name
- `content` (string, required): Prompt content/template
- `isTemplate` (boolean): Whether this is a template
- `tags` (array): Tags for categorization
- `variables` (array): Template variables definition
- `metadata` (object): Additional metadata

#### `get_prompt`

Retrieve a specific prompt by ID.

**Parameters:**

- `id` (string, required): Prompt ID

#### `list_prompts`

List all prompts with optional filtering.

**Parameters:**

- `tags` (array, optional): Filter by tags
- `search` (string, optional): Search term

#### `update_prompt`

Update an existing prompt.

**Parameters:**

- `id` (string, required): Prompt ID
- `updates` (object, required): Fields to update

#### `delete_prompt`

Delete a prompt.

**Parameters:**

- `id` (string, required): Prompt ID

#### `apply_template`

Apply variables to a prompt template.

**Parameters:**

- `id` (string, required): Template ID
- `variables` (object, required): Variable values

#### `get_stats`

Get statistics about stored prompts.

**Returns:**

- Total prompts count
- Templates count
- Regular prompts count
- Available tags
- Available categories

## Docker

### Available Images

```bash
# Default image (HTTP mode)
ghcr.io/roster/roster:latest

# MCP server mode (stdio)
ghcr.io/roster/roster:mcp

# AWS integration
ghcr.io/roster/roster:aws

# Memory storage
ghcr.io/roster/roster:memory

# File storage
ghcr.io/roster/roster:file
```

### Docker Compose

```yaml
version: '3.8'

services:
  roster:
    image: ghcr.io/roster/roster:latest
    ports:
      - '3000:3000'
    environment:
      - MODE=http
      - PORT=3000
      - STORAGE_TYPE=memory
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Build from Source

```bash
# Build default image
docker build -t roster/roster:latest .

# Build MCP server variant
docker build -f Dockerfile.mcp -t roster/roster:mcp .

# Build AWS variant
docker build -f Dockerfile.aws -t roster/roster:aws .
```

## Development

### Prerequisites

- Node.js 18+ or compatible runtime
- pnpm 8+ (or npm/yarn)
- Docker (optional)
- AWS CLI (for AWS deployments)

### Setup

```bash
# Clone your fork or upstream repository, then:
cd <repo-directory>

# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Run in development mode
pnpm run dev

# Run HTTP server
pnpm run dev:http

# Run MCP server
pnpm run dev:mcp
```

### Project Structure

```
roster-mcp/
├── src/
│   ├── adapters/          # Storage (file, memory, postgres, convex, AWS)
│   ├── core/              # Core domain logic
│   │   ├── entities/      # Domain entities
│   │   ├── services/      # Business logic services
│   │   └── ports/         # Interfaces
│   ├── mcp/               # MCP server implementation
│   ├── lambda/            # AWS Lambda handlers
│   ├── monitoring/        # CloudWatch metrics
│   ├── cli.ts             # CLI entry point
│   ├── index.ts           # HTTP server entry point
│   └── mcp-server-standalone.ts  # MCP stdio server
├── data/                  # Sample data
├── cdk/                   # AWS CDK infrastructure
├── scripts/               # Utility scripts
├── Dockerfile.*           # Docker configurations
└── package.json
```

## AWS Deployment

### Using AWS CDK

```bash
# Configure AWS credentials
aws configure

# Install dependencies
pnpm install

# Deploy infrastructure
cd cdk
cdk deploy --all

# Or use npm script
pnpm run cdk:deploy
```

### Manual Deployment

```bash
# Deploy using script
./scripts/deploy-aws.sh

# Cleanup resources
./scripts/cleanup-aws.sh
```

### Required AWS Resources

- DynamoDB table for prompts storage
- S3 bucket for catalog and artifacts
- SQS queue for async processing
- Lambda functions for serverless execution
- API Gateway for HTTP endpoints
- CloudWatch for monitoring
- Cognito for authentication (optional)

## Sample Prompts

The server includes several sample prompts:

- **Code Review Assistant**: Comprehensive code review template
- **Documentation Writer**: Technical documentation generator
- **Bug Analyzer**: Bug report analysis and investigation
- **Architecture Reviewer**: System architecture evaluation
- **Test Case Generator**: Automated test case creation

## Monitoring & Observability

### Logging

Structured JSON logging with pino:

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});
```

### Metrics (AWS)

CloudWatch metrics for:

- Request rates
- Error rates
- Latency
- Prompt usage
- Template applications

### Health Checks

```bash
# HTTP health check
curl http://localhost:3000/health

# CLI health check
roster health
```

## Security

### Best Practices

- ✅ Runs as non-root user in Docker
- ✅ Helmet middleware for HTTP security headers
- ✅ CORS configuration
- ✅ Rate limiting per user/tier
- ✅ Input validation with Zod
- ✅ AWS IAM roles for production
- ✅ Secrets management via environment variables
- ✅ Regular dependency updates

### Authentication

The HTTP server supports authentication via:

- Bearer tokens in Authorization header
- API Gateway Cognito authorizer (AWS)
- Custom authentication middleware

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**MCP server not starting**

- Check that no other process is using stdio
- Verify Node.js version (18+ required)
- Check logs: `LOG_LEVEL=debug roster start`

**HTTP server connection refused**

- Verify port is not in use: `lsof -i :3000`
- Check firewall settings
- Ensure MODE=http is set

**AWS connection failures**

- Verify AWS credentials: `aws sts get-caller-identity`
- Check IAM permissions for DynamoDB, S3, SQS
- Confirm region is correct

**Template variables not substituting**

- Ensure template has `isTemplate: true`
- Verify variable names match (case-sensitive)
- Check variable syntax: `{{variableName}}`

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) Maslow AI and contributors.

## Support

- **Documentation**: [docs/index.md](docs/index.md), [OPERATIONS.md](OPERATIONS.md) (Convex)
- **Package**: [npm `@maslowai/roster`](https://www.npmjs.com/package/@maslowai/roster)
- Issues and discussions: use your team’s GitHub repository when published.

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

## Acknowledgments

Built with:

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Express](https://expressjs.com/)
- [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [TypeScript](https://www.typescriptlang.org/)
- [Zod](https://zod.dev/)

---

<div align="center">

**[⬆ Back to Top](#roster-mcp)**

Made with care by **Maslow AI**

</div>
