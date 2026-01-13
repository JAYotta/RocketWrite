/**
 * System Prompt Version Manager
 *
 * Centralized management of different system prompt versions for A/B testing.
 */

import { createSystemPrompt as v1 } from "./v1-chinese-detailed";
import { createSystemPrompt as v2 } from "./v2-english-minimal";
import { createSystemPrompt as v3 } from "./v3-english-code-style";

export type PromptVersion = "v1" | "v2" | "v3";

export interface PromptVersionInfo {
  id: PromptVersion;
  name: string;
  description: string;
  language: "chinese" | "english";
  style: "detailed" | "minimal" | "code-style";
}

export const PROMPT_VERSIONS: Record<PromptVersion, PromptVersionInfo> = {
  v1: {
    id: "v1",
    name: "Chinese Detailed",
    description: "Chinese language with detailed command format descriptions",
    language: "chinese",
    style: "detailed",
  },
  v2: {
    id: "v2",
    name: "English Minimal",
    description: "English language, minimal description, relies on Zod schema",
    language: "english",
    style: "minimal",
  },
  v3: {
    id: "v3",
    name: "English Code-Style",
    description:
      "English language, code-style prompt (API documentation style)",
    language: "english",
    style: "code-style",
  },
};

const PROMPT_FACTORIES: Record<PromptVersion, (context?: string) => string> = {
  v1,
  v2,
  v3,
};

/**
 * Get system prompt for a specific version
 */
export function getSystemPrompt(
  version: PromptVersion = "v2",
  context?: string,
): string {
  const factory = PROMPT_FACTORIES[version];
  if (!factory) {
    throw new Error(`Unknown prompt version: ${version}`);
  }
  return factory(context);
}

/**
 * Get all available prompt versions
 */
export function getAvailableVersions(): PromptVersionInfo[] {
  return Object.values(PROMPT_VERSIONS);
}

/**
 * Get prompt version info
 */
export function getVersionInfo(version: PromptVersion): PromptVersionInfo {
  return PROMPT_VERSIONS[version];
}
