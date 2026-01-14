// Core TypeScript type definitions for editor commands
// These types are independent of Zod and serve as the domain model
// for editor operations.

/**
 * Position where text can be inserted
 */
export type EditorPosition = "selection" | "start" | "end";

/**
 * Format types supported by the editor
 */
export type EditorFormat = "bold" | "italic" | "highlight";

/**
 * Target description for text operations
 * Can be 'selection' for currently selected text, or a descriptive string
 * (e.g., 'the first paragraph', 'the word happy')
 */
export type EditorTarget = string;

/**
 * Command to insert text at a specific position
 */
export interface InsertTextCommand {
  type: "insertText";
  text: string;
  position?: EditorPosition; // Defaults to "selection" if not specified
}

/**
 * Command to delete text based on a target description
 */
export interface DeleteTextCommand {
  type: "deleteText";
  target: EditorTarget;
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
  target: EditorTarget;
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
