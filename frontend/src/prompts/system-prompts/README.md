# System Prompt Versions

This directory contains different versions of system prompts for A/B testing and optimization.

## Available Versions

### v1: Chinese Detailed

- **Language**: Chinese
- **Style**: Detailed with manual schema documentation
- **Features**:
  - Full command format descriptions
  - Chinese examples
  - Redundant schema documentation (Zod schema is auto-injected)

### v2: English Minimal (Default)

- **Language**: English
- **Style**: Minimal, relies on Zod schema
- **Features**:
  - Minimal description (relies on Zod schema auto-injection)
  - Few-shot examples only
  - Chinese examples (user input is Chinese)
  - More stable for code models

### v3: English Code-Style

- **Language**: English
- **Style**: Code-style (API documentation style)
- **Features**:
  - Triggers "coding mode" in Coder models
  - Interface/API documentation style
  - Minimal prompt reduces token usage

## Usage

### In Test Scripts

```typescript
import {
  getSystemPrompt,
  type PromptVersion,
} from "../src/prompts/system-prompts";

// Use default (v2)
const prompt = getSystemPrompt("v2", context);

// Use specific version
const prompt = getSystemPrompt("v1", context);
```

### Command Line

```bash
# Test with v1
pnpm exec tsx scripts/test-backend.ts --version=v1

# Test with v2 (default)
pnpm exec tsx scripts/test-backend.ts --version=v2

# Test with v3
pnpm exec tsx scripts/test-backend.ts --version=v3
```

## Adding New Versions

1. Create a new file: `v{N}-{name}.ts`
2. Export a `createSystemPrompt(context?: string): string` function
3. Add the version to `index.ts`:
   - Add to `PROMPT_VERSIONS` record
   - Add to `PROMPT_FACTORIES` record
   - Update `PromptVersion` type

## Testing Strategy

1. **Baseline**: Test all versions with the same test suite
2. **Metrics**: Compare accuracy, schema compliance, safety checks
3. **Documentation**: Record results in test reports

## Notes

- Vercel AI SDK automatically converts Zod schemas to JSON Schema and injects them
- Redundant schema documentation may confuse small models
- English prompts are generally more stable for code models (Qwen 2.5 Coder)
- Examples should match user input language (Chinese in this case)
