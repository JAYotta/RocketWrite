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

### `test-backend.test.ts`

Integration tests for LLM command parsing. These tests require Ollama to be running.

**Prerequisites:**

- Ollama must be running (`ollama serve`)
- Model `qwen2.5:1.5b` must be available (`ollama pull qwen2.5:1.5b`)

**Run independently:**

```bash
pnpm test test-backend
```

**Note:** Tests will be skipped if Ollama is not available.

### `tiptap-editor.test.tsx`

Unit tests for Tiptap editor commands. These tests verify editor functionality without rendering.

**Run independently:**

```bash
pnpm test tiptap-editor
```

## Writing New Tests

### For Schema/Utility Tests

Use `editor-commands.test.ts` as a template. These are pure unit tests with no external dependencies.

### For LLM Integration Tests

Use `test-backend.test.ts` as a template. Always check for Ollama availability and use `it.skipIf()` for conditional execution.

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
- Tests automatically skip if Ollama is unavailable
- Use `it.skipIf()` for conditional test execution
