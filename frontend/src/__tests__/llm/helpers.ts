import { generateObject } from "ai";
import { ollama } from "ai-sdk-ollama";
import { EditorCommandListSchema } from "../../schemas/editor-commands";
import type { EditorCommand } from "../../utils/editor-commands";

const MODEL_NAME = "qwen2.5-coder:1.5b";

/**
 * Check if Ollama is available and the required model exists.
 * Throws an error if Ollama is not available or the model is missing.
 */
export async function checkOllamaAvailable(): Promise<void> {
  const tagsResponse = await fetch("http://localhost:11434/api/tags", {
    signal: AbortSignal.timeout(2000),
  });

  if (!tagsResponse.ok) {
    throw new Error(
      "Ollama API not reachable. Start Ollama with: ollama serve",
    );
  }

  const tags = await tagsResponse.json();
  const modelExists = tags.models?.some(
    (model: { name: string }) => model.name === MODEL_NAME,
  );

  if (!modelExists) {
    throw new Error(
      `Model '${MODEL_NAME}' not found. Run: ollama pull ${MODEL_NAME}`,
    );
  }
}

/**
 * Generate command from LLM using Ollama
 */
export async function generateCommand(
  systemPrompt: string,
  userPrompt: string,
): Promise<EditorCommand[]> {
  const result = await generateObject({
    model: ollama(MODEL_NAME),
    system: systemPrompt,
    prompt: userPrompt,
    schema: EditorCommandListSchema,
    temperature: 0.1,
  });

  return result.object;
}
