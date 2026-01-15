import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Create a test editor instance with StarterKit
 */
export function createTestEditor(
  content: string = "<p>Hello World</p>",
): Editor {
  return new Editor({
    extensions: [StarterKit], // @TODO: Add Highlight extension for highlight format
    content,
  });
}

/**
 * Get plain text content from editor
 */
export function getTextContent(editor: Editor): string {
  return editor.state.doc.textContent;
}
