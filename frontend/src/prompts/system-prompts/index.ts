/**
 * System Prompt Version Manager
 *
 * Centralized management of different system prompt versions for A/B testing.
 */

import { SYSTEM_PROMPT_V1 as v1 } from "./v1-chinese-detailed";
import { SYSTEM_PROMPT_V2 as v2 } from "./v2-english-minimal";
import { SYSTEM_PROMPT_V3 as v3 } from "./v3-english-code-style";
import type { EditorCommand } from "../../utils/editor-commands";

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

const PROMPT_FACTORIES: Record<PromptVersion, string> = {
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
  previousCommand?: EditorCommand,
): string {
  const basePrompt = PROMPT_FACTORIES[version];
  if (!basePrompt) {
    throw new Error(`Unknown prompt version: ${version}`);
  }

  // Build context sections
  const contextSections: string[] = [];

  // Add document context if provided
  if (context) {
    const contextLabel = version === "v1" ? "Context" : "Context";
    contextSections.push(`${contextLabel}: ${context}`);
  } else {
    const contextLabel = version === "v1" ? "Context" : "Context";
    contextSections.push(`${contextLabel}: No context provided.`);
  }

  // Add previous command context if provided
  if (previousCommand) {
    const previousCommandLabel =
      version === "v1" ? "上一个操作" : "Previous Command";
    contextSections.push(
      `${previousCommandLabel}: ${JSON.stringify(previousCommand, null, 2)}`,
    );
  }

  // Append all context sections
  if (contextSections.length > 0) {
    return basePrompt + "\n\n" + contextSections.join("\n");
  }

  return basePrompt;
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
