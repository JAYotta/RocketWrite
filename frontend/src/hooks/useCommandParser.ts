import { useState } from "react";
import { generateObject } from "ai";
import { ollama } from "ai-sdk-ollama";
import type { Editor } from "@tiptap/react";
import type { EditorCommand } from "../utils/editor-commands";
import { EditorCommandListSchema } from "../schemas/editor-commands";
import { extractContext } from "../utils/contextExtractor";
import { getSystemPrompt } from "../prompts/system-prompts";
import type { PromptVersion } from "../prompts/system-prompts";

const MODEL_NAME = "qwen2.5-coder:1.5b";

/**
 * Result of command parsing
 */
export interface ParseCommandResult {
  /** Parsed commands array (empty if not a command) */
  commands: EditorCommand[];
  /** Whether the input was parsed as a command (non-empty array) */
  isCommand: boolean;
}

/**
 * Hook for parsing user input into editor commands using LLM
 *
 * Automatically extracts context from the editor and injects it into the system prompt.
 * Returns whether the input was parsed as a command or should be treated as content.
 *
 * @param editor - Tiptap editor instance (can be null)
 * @param promptVersion - System prompt version to use (default: "v2")
 * @returns Object with parseCommand function, loading state, and last command
 */
export function useCommandParser(
  editor: Editor | null,
  promptVersion: PromptVersion = "v2",
) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCommand, setLastCommand] = useState<EditorCommand | null>(null);

  /**
   * Parse user input and determine if it's a command or content
   *
   * @param userInput - User's natural language input (from ASR transcription)
   * @returns Promise resolving to ParseCommandResult with commands and isCommand flag
   */
  const parseCommand = async (
    userInput: string,
  ): Promise<ParseCommandResult> => {
    if (!editor) {
      // If no editor, treat as content
      return {
        commands: [],
        isCommand: false,
      };
    }

    setIsLoading(true);

    try {
      // 1. Extract context from editor
      const context = extractContext(editor);
      const contextString = context.full || "No context available.";

      // 2. Build system prompt with context
      const systemPrompt = getSystemPrompt(
        promptVersion,
        contextString,
        lastCommand || undefined,
      );

      // 3. Call LLM to parse command
      const result = await generateObject({
        model: ollama(MODEL_NAME),
        system: systemPrompt,
        prompt: userInput,
        schema: EditorCommandListSchema,
        temperature: 0.1,
      });

      const commands = result.object;

      // 4. Determine if it's a command (non-empty array)
      const isCommand = commands.length > 0;

      // 5. Store last command for undo/correction context
      if (isCommand && commands.length > 0) {
        setLastCommand(commands[0]); // Store first command for context
      }

      return {
        commands,
        isCommand,
      };
    } catch (error) {
      console.error("[useCommandParser] Failed to parse command:", error);
      // On error, treat as content (fallback to transcription)
      return {
        commands: [],
        isCommand: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parseCommand,
    isLoading,
    lastCommand,
  };
}