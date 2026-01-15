// Core TypeScript type definitions for editor commands
// These types are independent of Zod and serve as the domain model
// for editor operations.

/**
 * Format types supported by the editor
 * @TODO: Add more formats if needed (e.g. highlight, code, heading, etc.)
 */
export type EditorFormat = "bold" | "italic";

/**
 * Range for text operations (delete/format)
 * Only supports 'selection' or range coordinates
 */
export type EditorRange =
  | "selection" // Use current selection
  | { from: number; to: number }; // Specific range coordinates

/**
 * Position for text insertion
 * Supports various position types (point operations, not range)
 * Does NOT include 'selection', as insertion without target defaults to current selection
 */
export type EditorPosition =
  | number // Specific position
  | "selectionStart" // Start of current selection
  | "selectionEnd" // End of current selection
  | "documentStart" // Document start
  | "documentEnd"; // Document end

/**
 * Combined target type for insertText (supports both position and range)
 * Currently only used for insertText's optional target field
 */
export type EditorTarget = EditorPosition | EditorRange;

/**
 * Command to insert text at a specific position
 */
export interface InsertTextCommand {
  type: "insertText";
  text: string;
  target?: EditorTarget; // Optional: if not provided, use insertContent(text) at current selection
}

/**
 * Command to delete text based on a target description
 */
export interface DeleteTextCommand {
  type: "deleteText";
  target: EditorRange; // Only 'selection' or {from, to}
}

/**
 * Command to replace existing text with new text
 */
export interface ReplaceTextCommand {
  type: "replaceText";
  old: string;
  new: string;
}

/**
 * Command to apply formatting to text
 */
export interface ApplyFormatCommand {
  type: "applyFormat";
  format: EditorFormat;
  target: EditorRange; // Only 'selection' or {from, to}
}

/**
 * Command to undo the last operation
 */
export interface UndoCommand {
  type: "undo";
}

/**
 * Command to redo the last undone operation
 */
export interface RedoCommand {
  type: "redo";
}

/**
 * Union type representing all possible editor commands
 */
export type EditorCommand =
  | InsertTextCommand
  | DeleteTextCommand
  | ReplaceTextCommand
  | ApplyFormatCommand
  | UndoCommand
  | RedoCommand;
