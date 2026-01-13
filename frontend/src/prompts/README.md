# Prompts Directory

System prompts and prompt engineering resources for A/B testing.

## Quick Start

```typescript
import { getSystemPrompt } from "./prompts/system-prompts";

// Use default (v2)
const prompt = getSystemPrompt("v2", context);
```

```bash
# Test different versions
pnpm exec tsx scripts/test-backend.ts --version=v2
```

## Version Comparison

| Version | Language | Style      | Best For                  |
| ------- | -------- | ---------- | ------------------------- |
| v1      | Chinese  | Detailed   | Baseline testing          |
| v2      | English  | Minimal    | Production (default)      |
| v3      | English  | Code-style | Coder models optimization |

For details, see [system-prompts/README.md](./system-prompts/README.md).
