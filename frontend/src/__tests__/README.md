# Testing Guide

This directory contains tests for the RocketWrite frontend.

## Setup

Install test dependencies:

```bash
pnpm install
```

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

### `editor-commands.test.ts`

Unit tests for Zod schema validation. These tests verify that the command schemas correctly validate and reject invalid inputs.

**Run independently:**

```bash
pnpm test editor-commands
```

### `llm/` - LLM Integration Tests

LLM-related tests and utilities are organized in the `llm/` subdirectory.

#### `llm/ollama-integration.test.ts`

Integration tests for Ollama connectivity and basic functionality. Uses a fixed prompt version (v2) to verify that Ollama integration is working correctly.

**Prerequisites:**

- Ollama must be running (`ollama serve`)
- Model `qwen2.5-coder:1.5b` must be available (`ollama pull qwen2.5-coder:1.5b`)

**Run independently:**

```bash
pnpm test ollama-integration
```

**Note:** Tests will fail if Ollama is not available (throws error in `beforeAll`).

#### `llm/prompt-versions.test.ts`

A/B testing for different prompt versions (v1, v2, v3). Compares the performance of different prompt styles to evaluate which works best.

**Prerequisites:**

- Ollama must be running (`ollama serve`)
- Model `qwen2.5-coder:1.5b` must be available (`ollama pull qwen2.5-coder:1.5b`)

**Run independently:**

```bash
pnpm test prompt-versions
```

**Note:** Tests will fail if Ollama is not available (throws error in `beforeAll`).

#### `llm/helpers.ts`

Shared utilities for LLM tests:
- `checkOllamaAvailable()` - Check if Ollama is available and the required model exists
- `generateCommand()` - Generate command from LLM using Ollama
- `validateSafetyTest()` - Default validation for safety tests

#### `llm/test-cases.ts`

Test case definitions:
- `TestCase` interface
- `TEST_CASES` array - All test cases with their validation logic

### `editor/` - Editor Integration Tests

Editor-related tests are organized in the `editor/` subdirectory.

#### `editor/tiptap-commands.test.tsx`

Unit tests for Tiptap editor commands. These tests verify editor functionality without rendering.

**Run independently:**

```bash
pnpm test tiptap-commands
```

#### `editor/command-executor.test.ts`

Integration tests for `commandExecutor` with Tiptap Editor. Tests that `EditorCommand` objects are correctly executed and produce expected results.

**Run independently:**

```bash
pnpm test command-executor
```

**Test coverage:**
- All command types (insertText, deleteText, replaceText, applyFormat, undo, redo)
- Editor state changes (HTML content, formatting)
- Edge cases (empty document, no selection)
- Undo/redo functionality

#### `editor/helpers.ts`

Shared utilities for editor tests:
- `createTestEditor()` - Create a test editor instance with StarterKit
- `getTextContent()` - Get plain text content from editor

## Writing New Tests

### For Schema/Utility Tests

Use `editor-commands.test.ts` as a template. These are pure unit tests with no external dependencies.

### For LLM Integration Tests

Use `llm/ollama-integration.test.ts` or `llm/prompt-versions.test.ts` as templates. Always check for Ollama availability using `checkOllamaAvailable()` from `llm/helpers.ts`. The test suite will fail early if Ollama is not available (using `beforeAll` + `throw Error`).

### For Editor Integration Tests

Use `editor/command-executor.test.ts` or `editor/tiptap-commands.test.tsx` as templates. Use `createTestEditor()` from `editor/helpers.ts` to create test editor instances. Mock external dependencies like `sonner` toast notifications when needed.

### For React Component Tests

Create tests in component directories or `__tests__` subdirectories. Use `@testing-library/react` for rendering.

Example:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "../components/MyComponent";

describe("MyComponent", () => {
  it("should render", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

## Test Configuration

- **Framework**: Vitest (Vite-native testing)
- **Environment**: Node.js for scripts, jsdom for React components
- **Coverage**: v8 provider
- **Config**: `vitest.config.ts`

## Notes

- LLM tests have a 30s timeout
- LLM integration tests will fail early if Ollama is not available (throws error in `beforeAll`)
- Use `checkOllamaAvailable()` from `llm/helpers.ts` for Ollama availability checks
