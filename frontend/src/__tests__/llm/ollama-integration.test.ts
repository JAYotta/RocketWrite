/**
 * Ollama Integration Tests
 *
 * These tests verify that Ollama integration is working correctly.
 * Uses a fixed prompt version (v2) to focus on integration validation.
 */

import { describe, it, beforeAll } from "vitest";
import { getSystemPrompt } from "../../prompts/system-prompts";
import { TEST_CASES } from "./test-cases";
import { checkOllamaAvailable, generateCommand } from "./helpers";

describe("Ollama Integration", () => {
  beforeAll(async () => {
    await checkOllamaAvailable();
  });

  const PROMPT_VERSION = "v2" as const;

  TEST_CASES.forEach((testCase) => {
    it(
      testCase.name,
      { timeout: 30000 },
      async () => {
        const systemPrompt = getSystemPrompt(
          PROMPT_VERSION,
          testCase.context,
          testCase.previousCommand,
        );

        const toolCalls = await generateCommand(systemPrompt, testCase.prompt);
        testCase.validate(toolCalls);
      },
    );
  });
});
