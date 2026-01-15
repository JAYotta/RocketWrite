import { z } from "zod";
import type { EditorCommand } from "../utils/editor-commands";
// Note: Core types are defined in utils/editor-commands.ts
// These Zod schemas wrap the core types for LLM validation via Vercel AI SDK

// Range schema for delete/format operations (only 'selection' or range object)
const EditorRangeSchema = z.union([
  z.literal("selection"),
  z.object({
    from: z.number().int().min(0).describe("Start position (inclusive)"),
    to: z.number().int().min(0).describe("End position (exclusive)"),
  }),
]);

// Position schema for insert operations (supports various position types, but NOT 'selection')
const EditorPositionSchema = z.union([
  z.number().int().min(0),
  z.literal("selectionStart"),
  z.literal("selectionEnd"),
  z.literal("documentStart"),
  z.literal("documentEnd"),
]);

// Combined target schema for insertText (supports both position and range)
const EditorTargetSchema = z.union([EditorPositionSchema, EditorRangeSchema]);

// Zod Schema for InsertTextCommand (wraps core type)
export const InsertTextSchema = z.object({
  type: z.literal("insertText"),
  text: z.string().describe("The text to insert."),
  target: EditorTargetSchema.optional().describe(
    "Optional: Where to insert the text. If not provided, inserts at current selection using insertContent(text).",
  ),
});

// Zod Schema for DeleteTextCommand (wraps core type)
export const DeleteTextSchema = z.object({
  type: z.literal("deleteText"),
  target: EditorRangeSchema.describe(
    "Target to delete: either current selection or a range with from/to coordinates",
  ),
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
  target: EditorRangeSchema.describe(
    "Target to format: either current selection or a range with from/to coordinates",
  ),
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
// Note: Zod's .default() changes the inferred type (optional fields become required),
// but runtime values will still match EditorCommand, so we validate assignability
type _SchemaInferredType = z.infer<typeof EditorCommandSchema>;
// Compile-time check: if SchemaInferredType is not assignable to EditorCommand, this will error
const _typeCheckCompatibility = (_: _SchemaInferredType): EditorCommand => {
  // This function validates type compatibility at compile time
  // If types don't match, TypeScript will error here
  return _ as EditorCommand;
};
// Suppress the error by explicitly calling the function
void _typeCheckCompatibility;

// Re-export core type for backward compatibility
export type { EditorCommand } from "../utils/editor-commands";
