/**
 * Prompt Version Comparison Tests
 *
 * These tests compare the performance of different prompt versions (v1, v2, v3).
 * Used for A/B testing to evaluate which prompt style works best.
 */

import { describe, it, beforeAll } from "vitest";
import { getSystemPrompt, type PromptVersion } from "../../prompts/system-prompts";
import { TEST_CASES } from "./test-cases";
import { checkOllamaAvailable, generateCommand } from "./helpers";

describe("Prompt Version Comparison", () => {
  beforeAll(async () => {
    await checkOllamaAvailable();
  });

  const promptVersions: PromptVersion[] = ["v1", "v2", "v3"];

  promptVersions.forEach((version) => {
    describe(`Prompt Version: ${version}`, () => {
      TEST_CASES.forEach((testCase) => {
        it(
          testCase.name,
          { timeout: 30000 },
          async () => {
            const systemPrompt = getSystemPrompt(
              version,
              testCase.context,
              testCase.previousCommand,
            );

            const toolCalls = await generateCommand(systemPrompt, testCase.prompt);
            testCase.validate(toolCalls);
          },
        );
      });
    });
  });
});
