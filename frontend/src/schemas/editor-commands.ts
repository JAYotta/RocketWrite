import { z } from "zod";
import type { EditorCommand } from "../utils/editor-commands";
// Note: Core types are defined in utils/editor-commands.ts
// These Zod schemas wrap the core types for LLM validation via Vercel AI SDK

// Base schema for position/target to ensure consistency
// For 1.5B model, we prefer simple string descriptions or 'selection'
// over complex start/end coordinates.
const EditorTargetSchema = z
  .string()
  .describe(
    "The target text or range. Use 'selection' for currently selected text. " +
      "Otherwise, provide a descriptive string (e.g., 'the first paragraph', 'the word happy').",
  );

// Zod Schema for InsertTextCommand (wraps core type)
export const InsertTextSchema = z.object({
  type: z.literal("insertText"),
  text: z.string().describe("The text to insert."),
  position: z
    .enum(["selection", "start", "end"])
    .default("selection")
    .describe("Where to insert the text. Defaults to current selection."),
});

// Zod Schema for DeleteTextCommand (wraps core type)
export const DeleteTextSchema = z.object({
  type: z.literal("deleteText"),
  target: EditorTargetSchema,
});

// Zod Schema for ReplaceTextCommand (wraps core type)
export const ReplaceTextSchema = z.object({
  type: z.literal("replaceText"),
  old: z
    .string()
    .describe("The exact text to be replaced. MUST match existing content."),
  new: z.string().describe("The new text to replace with."),
});

// Limited set of formats that a 1.5B model can reliably distinguish
export const FormatTypeSchema = z.enum(["bold", "italic", "highlight"]);

// Zod Schema for ApplyFormatCommand (wraps core type)
export const ApplyFormatSchema = z.object({
  type: z.literal("applyFormat"),
  format: FormatTypeSchema,
  target: EditorTargetSchema,
});

// Zod Schema for UndoCommand (wraps core type)
export const UndoCommandSchema = z
  .object({
    type: z.literal("undo"),
  })
  .describe("Undo the last operation. No additional parameters needed.");

// Zod Schema for RedoCommand (wraps core type)
export const RedoCommandSchema = z
  .object({
    type: z.literal("redo"),
  })
  .describe("Redo the last undone operation. No additional parameters needed.");

// Union of all possible editor commands (wraps core type)
// Type compatibility with EditorCommand is ensured through inference
export const EditorCommandSchema = z.discriminatedUnion("type", [
  InsertTextSchema,
  DeleteTextSchema,
  ReplaceTextSchema,
  ApplyFormatSchema,
  UndoCommandSchema,
  RedoCommandSchema,
]);

// Array schema for LLM output (list of commands)
export const EditorCommandListSchema = z
  .array(EditorCommandSchema)
  .describe(
    "Array of commands to execute. Empty array means no action needed.",
  );

// Type-level validation: ensure Zod schema inference is compatible with EditorCommand
// This ensures that values parsed by Zod schemas can be safely used as EditorCommand
// Note: Zod's .default() changes the inferred type (optional fields become required),
// but runtime values will still match EditorCommand, so we validate assignability
type _SchemaInferredType = z.infer<typeof EditorCommandSchema>;
// Compile-time check: if SchemaInferredType is not assignable to EditorCommand, this will error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _typeCheckCompatibility = (_: _SchemaInferredType): EditorCommand => _;

// Re-export core type for backward compatibility
export type { EditorCommand } from "../utils/editor-commands";
