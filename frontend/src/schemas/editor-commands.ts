import { z } from "zod";

// Base schema for position/target to ensure consistency
// For 1.5B model, we prefer simple string descriptions or 'selection'
// over complex start/end coordinates.
const EditorTargetSchema = z
  .string()
  .describe(
    "The target text or range. Use 'selection' for currently selected text. " +
      "Otherwise, provide a descriptive string (e.g., 'the first paragraph', 'the word happy').",
  );

export const InsertTextSchema = z.object({
  type: z.literal("insertText"),
  text: z.string().describe("The text to insert."),
  position: z
    .enum(["selection", "start", "end"])
    .default("selection")
    .describe("Where to insert the text. Defaults to current selection."),
});

export const DeleteTextSchema = z.object({
  type: z.literal("deleteText"),
  target: EditorTargetSchema,
});

export const ReplaceTextSchema = z.object({
  type: z.literal("replaceText"),
  old: z
    .string()
    .describe("The exact text to be replaced. MUST match existing content."),
  new: z.string().describe("The new text to replace with."),
});

// Limited set of formats that a 1.5B model can reliably distinguish
export const FormatTypeSchema = z.enum(["bold", "italic", "highlight"]);

export const ApplyFormatSchema = z.object({
  type: z.literal("applyFormat"),
  format: FormatTypeSchema,
  target: EditorTargetSchema,
});

export const UndoCommandSchema = z
  .object({
    type: z.literal("undo"),
  })
  .describe("Undo the last operation. No additional parameters needed.");

export const RedoCommandSchema = z
  .object({
    type: z.literal("redo"),
  })
  .describe("Redo the last undone operation. No additional parameters needed.");

// Union of all possible editor commands
export const EditorCommandSchema = z.discriminatedUnion("type", [
  InsertTextSchema,
  DeleteTextSchema,
  ReplaceTextSchema,
  ApplyFormatSchema,
  UndoCommandSchema,
  RedoCommandSchema,
]);

export type EditorCommand = z.infer<typeof EditorCommandSchema>;

export const EditorCommandListSchema = z
  .array(EditorCommandSchema)
  .describe(
    "Array of commands to execute. Empty array means no action needed.",
  );
