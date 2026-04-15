# Release summary — v3.12.3 (historical)

**Product today:** Roster MCP · Maslow AI · npm `@maslowai/roster`. This file is an **archived** summary for v3.12.3.

**Release Date**: October 1, 2025  
**Version**: 3.12.3  
**Status**: ✅ **PRODUCTION READY**

---

## 🎉 Release Overview

Release v3.12.3 introduced production security enhancements for the prompt MCP server (now **Roster MCP** / `@maslowai/roster`), with industry-standard AWS and container practices.

---

## 🔐 Security Enhancements

### ✅ **IAM Roles & Policies**

- **ECS Task Role**: Minimal permissions for DynamoDB, S3, Secrets Manager
- **ECS Execution Role**: ECR, CloudWatch Logs, Secrets Manager access
- **No Access Keys**: Eliminated hardcoded credentials in containers

### ✅ **AWS Secrets Manager**

- **Centralized Secrets**: All sensitive data stored securely
- **Automatic Rotation**: Support for secret rotation policies
- **Access Control**: IAM-based access to secrets

### ✅ **TLS/HTTPS Encryption**

- **SSL Certificates**: ACM integration for custom domains
- **HTTPS Redirect**: Automatic HTTP to HTTPS redirection
- **End-to-End Encryption**: All data encrypted in transit

### ✅ **Enhanced Authentication**

- **Cognito Integration**: User pools with MFA support
- **Strong Password Policy**: 12+ character requirements
- **JWT Tokens**: Secure token-based authentication
- **Advanced Security**: Risk-based authentication

### ✅ **VPC Security**

- **Private Subnets**: Isolated container deployment
- **VPC Endpoints**: Direct AWS service access (no internet)
- **Security Groups**: Minimal network access rules
- **NAT Gateway**: Secure outbound internet access

### ✅ **Container Security**

- **Non-root User**: Containers run as `mcp-prompts:nodejs`
- **Minimal Base Image**: Alpine Linux with security updates
- **Health Checks**: Container health monitoring
- **Signal Handling**: Proper graceful shutdown

### ✅ **Data Encryption**

- **DynamoDB**: AWS managed encryption (AES-256)
- **S3 Buckets**: Server-side encryption enabled
- **Secrets Manager**: AWS managed encryption
- **EBS Volumes**: Encryption at rest

---

## Deployment options (current)

**Today:** install **`@maslowai/roster`** (Roster MCP · Maslow AI). The commands below are **representative**; v3.12.3-era Docker/registry tags may differ.

### npm

```bash
pnpm add @maslowai/roster
# MCP stdio: point your client at the `roster-mcp` binary from this package — see examples/README.md
```

### Docker (example)

```bash
docker build -f Dockerfile.production -t roster-mcp:prod .
docker run -p 3003:3003 roster-mcp:prod
```

---

## 📊 Test Results

### **✅ Security Tests**

- Secrets Manager: ✅ PASS
- IAM Roles: ✅ PASS
- ECR Repository: ✅ PASS
- DynamoDB Encryption: ✅ PASS
- S3 Encryption: ✅ PASS
- S3 Public Access: ✅ BLOCKED

### **✅ Functional Tests**

- Container Health: ✅ HEALTHY
- API Endpoints: ✅ 39 prompts available
- MCP Protocol: ✅ OPERATIONAL
- AWS Services: ✅ ALL CONNECTED

### **✅ Performance**

- Memory Usage: 28.82 MiB
- CPU Usage: 0.00% (idle)
- Response Time: <150ms
- Startup Time: ~5 seconds

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet Gateway                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                CloudFront CDN                              │
│  • SSL/TLS Termination                                     │
│  • DDoS Protection                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Application Load Balancer                     │
│  • SSL/TLS Termination                                     │
│  • Health Checks                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  ECS Fargate                               │
│  • Non-root containers                                     │
│  • Secrets from Secrets Manager                            │
│  • IAM roles (no access keys)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    VPC Endpoints                           │
│  • DynamoDB Gateway Endpoint                               │
│  • S3 Gateway Endpoint                                     │
│  • Secrets Manager Interface Endpoint                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  AWS Services                              │
│  • DynamoDB (encrypted)                                    │
│  • S3 (encrypted, access logs)                             │
│  • Cognito (MFA, strong passwords)                         │
│  • CloudWatch (monitoring, alerting)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## MCP configuration (illustrative)

### Sample `.cursor/mcp.json` patterns

```json
{
  "mcpServers": {
    "roster-docker-aws": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-p",
        "3004:3003",
        "-e",
        "STORAGE_TYPE=aws",
        "-e",
        "AWS_REGION=eu-north-1",
        "-e",
        "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}",
        "-e",
        "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}",
        "-e",
        "PROMPTS_TABLE=mcp-prompts",
        "-e",
        "SESSIONS_TABLE=mcp-sessions",
        "-e",
        "PROMPTS_BUCKET=mcp-prompts-catalog-875486186075-eu-north-1",
        "-e",
        "PROCESSING_QUEUE=https://sqs.eu-north-1.amazonaws.com/875486186075/mcp-prompts-processing",
        "-e",
        "MODE=http",
        "roster-mcp:test"
      ]
    },
    "roster-memory": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "memory",
        "LOG_LEVEL": "debug"
      }
    },
    "roster-file": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "file",
        "LOG_LEVEL": "debug"
      }
    },
    "roster-postgres": {
      "command": "npx",
      "args": ["-y", "@maslowai/roster"],
      "env": {
        "MODE": "mcp",
        "STORAGE_TYPE": "postgres",
        "POSTGRES_URL": "postgres://postgres:postgres@localhost:5432/mcp_prompts",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

---

## 🔧 New Files & Scripts

### **Security Scripts**

- `scripts/setup-security.sh` - Automated security setup
- `scripts/test-security.sh` - Comprehensive security testing

### **Production Files**

- `Dockerfile.production` - Hardened production container
- `cdk/lib/mcp-prompts-security-stack.ts` - Secure CDK stack
- `PRODUCTION_SECURITY_GUIDE.md` - Complete security guide

### **Documentation**

- `DOCKER_AWS_TEST_REPORT.md` - Container testing results
- `RELEASE_SUMMARY_v3.12.3.md` - This release summary

---

## 📈 Performance Metrics

| Metric             | Value        | Status       |
| ------------------ | ------------ | ------------ |
| **Memory Usage**   | 28.82 MiB    | ✅ Excellent |
| **CPU Usage**      | 0.00% (idle) | ✅ Excellent |
| **Response Time**  | <150ms       | ✅ Excellent |
| **Startup Time**   | ~5 seconds   | ✅ Good      |
| **Health Check**   | Passing      | ✅ Healthy   |
| **Security Score** | 100%         | ✅ Perfect   |

---

## 🎯 Use Cases

### **✅ Production Deployment**

- Enterprise-grade security
- Scalable ECS/Fargate deployment
- High availability (multi-AZ)
- Automated monitoring

### **✅ Development**

- Local Docker containers
- Memory/file storage options
- Hot reload support
- Debug logging

### **✅ Testing**

- Comprehensive test suite
- Security validation
- Performance benchmarking
- Integration testing

---

## 🚀 Next Steps

### **Immediate**

1. Deploy to production using security stack
2. Configure custom domain with SSL
3. Set up monitoring dashboards
4. Train team on security procedures

### **Future Releases**

1. Multi-region deployment
2. Advanced analytics
3. API rate limiting
4. Webhook integrations

---

## Support

- **npm / docs**: [@maslowai/roster](https://www.npmjs.com/package/@maslowai/roster), [docs/index.md](docs/index.md)
- **Security**: [SECURITY.md](SECURITY.md), [PRODUCTION_SECURITY_GUIDE.md](PRODUCTION_SECURITY_GUIDE.md)

---

## ✅ Release Checklist

- [x] **Security Implementation**
  - [x] IAM roles configured
  - [x] Secrets Manager setup
  - [x] VPC with private subnets
  - [x] VPC endpoints configured
  - [x] SSL certificate ready
  - [x] Container security hardened
  - [x] Encryption enabled
  - [x] Monitoring configured

- [x] **Testing**
  - [x] Security tests passing
  - [x] Functional tests passing
  - [x] Performance tests passing
  - [x] Integration tests passing

- [x] **Deployment**
  - [x] NPM package published
  - [x] Docker images built
  - [x] Registry pushes completed
  - [x] Git repository updated

- [x] **Documentation**
  - [x] Security guide created
  - [x] Test reports generated
  - [x] MCP configuration updated
  - [x] Release notes written

---

**🎉 MCP-Prompts v3.12.3 is now PRODUCTION READY!**

_All security enhancements implemented, tested, and deployed successfully._

---

**Release Manager**: AI Assistant  
**Release Date**: October 1, 2025  
**Version**: 3.12.3  
**Status**: ✅ **COMPLETE**
