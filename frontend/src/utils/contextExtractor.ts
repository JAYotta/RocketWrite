import type { Editor } from "@tiptap/react";

/**
 * Extract context from editor for LLM command parsing
 *
 * Implements a sliding window strategy to extract text around the current selection,
 * providing context for better command understanding.
 */
export interface EditorContext {
  /** Current selection text */
  selection: string;
  /** Text before selection (sliding window) */
  before: string;
  /** Text after selection (sliding window) */
  after: string;
  /** Formatted full context string for System Prompt */
  full: string;
}

/**
 * Extract context from editor
 *
 * @param editor - Tiptap editor instance
 * @param windowSize - Number of characters to extract before/after selection (default: 1000, 500 each side)
 * @returns EditorContext object with selection, before, after, and formatted full context
 */
export function extractContext(
  editor: Editor,
  windowSize: number = 1000,
): EditorContext {
  if (!editor) {
    return {
      selection: "",
      before: "",
      after: "",
      full: "",
    };
  }

  const { from, to } = editor.state.selection;
  const docSize = editor.state.doc.content.size;

  // Calculate window bounds
  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(0, from - halfWindow);
  const end = Math.min(docSize, to + halfWindow);

  // Extract text segments
  const selection = editor.state.doc.textBetween(from, to);
  const before = editor.state.doc.textBetween(start, from);
  const after = editor.state.doc.textBetween(to, end);

  // Format full context string for System Prompt
  // Format: [前文]...<selection>选中文本</selection>...[后文]
  const full = `${before.length > 0 ? `${before}...` : ""}<selection>${selection}</selection>${after.length > 0 ? `...${after}` : ""}`;

  return {
    selection,
    before,
    after,
    full,
  };
}