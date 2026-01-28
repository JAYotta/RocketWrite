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

### `asr/` - ASR (Audio Speech Recognition) Tests

ASR-related tests are organized in the `asr/` subdirectory.

#### `asr/audio-utils.test.ts`

Unit tests for WAV encoding using VAD library's built-in `utils.encodeWAV`:
- Tests `utils.encodeWAV()` from `@ricky0123/vad-react` which converts Float32Array to WAV ArrayBuffer
- Verifies WAV header format and conversion to Blob for file upload

**Note:** We use the official `utils.encodeWAV()` from `@ricky0123/vad-react` instead of a custom implementation. This is better integrated with the VAD library's output format and eliminates the need for additional dependencies.

**Run independently:**

```bash
pnpm test audio-utils
```

### `llm/` - LLM Integration Tests

LLM-related tests and utilities are organized in the `llm/` subdirectory.

#### `llm/prompt-to-command.test.ts`

Tests that verify the LLM can correctly parse user's natural language prompts and convert them into structured editor commands. Uses a fixed prompt version (v2) to focus on command parsing validation.

**Prerequisites:**

- Ollama must be running (`ollama serve`)
- Model `qwen2.5-coder:1.5b` must be available (`ollama pull qwen2.5-coder:1.5b`)

**Run independently:**

```bash
pnpm test prompt-to-command
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

#### `llm/test-cases.ts`

Test case definitions:

- `TestCase` interface
- `TEST_CASES` array - All test cases with their validation logic

### `editor/` - Editor Integration Tests

Editor-related tests are organized in the `editor/` subdirectory.

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

### `app/` - App Component Tests

App-related tests are organized in the `app/` subdirectory.

#### `app/MicrophoneButton.test.tsx`

Unit tests for Microphone Button UI behavior (VAD-related), including:
- Button states based on listening/userSpeaking
- Button interactions (start/pause)
- Loading indicator display during command parsing
- Button disabled states

**Run independently:**

```bash
pnpm test MicrophoneButton
```

#### `app/app-flow.test.tsx`

End-to-end tests for App.tsx command flow. These tests verify the complete flow from user input to command execution:

1. Intent detection (parseCommand)
2. Route decision (command vs content)
3. Command execution or content insertion

**Note:** Command execution itself is tested in `editor/command-executor.test.ts`. This test focuses on App.tsx's routing logic and integration between components.

**Run independently:**

```bash
pnpm test app-flow
```

## Writing New Tests

### For Schema/Utility Tests

Use `editor-commands.test.ts` as a template. These are pure unit tests with no external dependencies.

### For LLM Integration Tests

Use `llm/prompt-to-command.test.ts` or `llm/prompt-versions.test.ts` as templates. Always check for Ollama availability using `checkOllamaAvailable()` from `llm/helpers.ts`. The test suite will fail early if Ollama is not available (using `beforeAll` + `throw Error`).

### For Editor Integration Tests

Use `editor/command-executor.test.ts` as a template. Use `createTestEditor()` from `editor/helpers.ts` to create test editor instances. Mock external dependencies like `sonner` toast notifications when needed.

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
