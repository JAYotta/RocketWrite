/**
 * Prompt to Command Tests
 *
 * These tests verify that the LLM can correctly parse user's natural language prompts
 * and convert them into structured editor commands.
 * Uses a fixed prompt version (v2) to focus on command parsing validation.
 */

import { describe, it, beforeAll } from "vitest";
import { getSystemPrompt } from "../../prompts/system-prompts";
import { TEST_CASES } from "./test-cases";
import { checkOllamaAvailable, generateCommand } from "./helpers";

describe("Prompt to Command", () => {
  beforeAll(async () => {
    await checkOllamaAvailable();
  });

  const PROMPT_VERSION = "v2" as const;

  TEST_CASES.forEach((testCase) => {
    it(testCase.name, { timeout: 30000 }, async () => {
      const systemPrompt = getSystemPrompt(
        PROMPT_VERSION,
        testCase.context,
        testCase.previousCommand,
      );

      const toolCalls = await generateCommand(systemPrompt, testCase.prompt);
      testCase.validate(toolCalls);
    });
  });
});
