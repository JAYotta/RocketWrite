/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { EditorCommand } from "../../utils/editor-commands";
import { executeCommand } from "../../utils/commandExecutor";
import { createTestEditor, getTextContent } from "./helpers";

// Mock toast to avoid side effects in tests
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked toast after mocking
import { toast } from "sonner";

// Use jsdom environment for editor tests
describe("Command Executor Integration", () => {
  let editor: ReturnType<typeof createTestEditor>;

  beforeEach(() => {
    // Create editor with empty content to avoid initial history issues
    editor = createTestEditor("<p></p>");
    vi.mocked(toast.info).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  afterEach(() => {
    editor.destroy();
  });

  describe("insertText", () => {
    it("should insert text at selection (default, no target)", () => {
      const command: EditorCommand = {
        type: "insertText",
        text: "New Text",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(getTextContent(editor)).toContain("New Text");
    });

    it("should insert text at documentStart", () => {
      editor.commands.setContent("<p>Original</p>");
      const command: EditorCommand = {
        type: "insertText",
        text: "Prefix ",
        target: "documentStart",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      const content = getTextContent(editor);
      expect(content).toContain("Prefix Original");
    });

    it("should insert text at documentEnd", () => {
      editor.commands.setContent("<p>Original</p>");
      const command: EditorCommand = {
        type: "insertText",
        text: " Suffix",
        target: "documentEnd",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      const content = getTextContent(editor);
      expect(content).toContain("Original Suffix");
    });

    it("should insert text at specific position", () => {
      editor.commands.setContent("<p>Hello World</p>");
      // Position 6 is after "Hello" (H=1, e=2, l=3, l=4, o=5, space=6 in Tiptap)
      const command: EditorCommand = {
        type: "insertText",
        text: " Beautiful",
        target: 6,
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      const content = getTextContent(editor);
      expect(content).toContain("Hello Beautiful World");
    });

    it("should insert text at selection when target is 'selection'", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.selectAll();
      const command: EditorCommand = {
        type: "insertText",
        text: "New",
        target: "selection",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(getTextContent(editor)).toContain("New");
    });
  });

  describe("deleteText", () => {
    it("should delete selected text when target is 'selection'", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.selectAll();

      const command: EditorCommand = {
        type: "deleteText",
        target: "selection",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      // Selection deletion should work
      expect(getTextContent(editor).trim()).toBe("");
    });

    it("should delete text at specific range", () => {
      editor.commands.setContent("<p>Hello World</p>");

      const command: EditorCommand = {
        type: "deleteText",
        target: { from: 0, to: 5 },
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(getTextContent(editor)).toContain("World");
      expect(getTextContent(editor)).not.toContain("Hello");
    });
  });

  describe("replaceText", () => {
    it("should show toast notification", () => {
      editor.commands.setContent("<p>Hello World</p>");

      const command: EditorCommand = {
        type: "replaceText",
        old: "Hello",
        new: "Hi",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(vi.mocked(toast.info)).toHaveBeenCalledWith(
        expect.stringContaining("Hello"),
      );
    });
  });

  describe("applyFormat", () => {
    it("should apply bold format", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.selectAll();

      const command: EditorCommand = {
        type: "applyFormat",
        format: "bold",
        target: "selection",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(editor.getHTML()).toContain("<strong>");
    });

    it("should apply italic format", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.selectAll();

      const command: EditorCommand = {
        type: "applyFormat",
        format: "italic",
        target: "selection",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(editor.getHTML()).toContain("<em>");
    });
  });

  describe("undo", () => {
    it("should undo last operation", () => {
      // Create editor with initial content to establish history baseline
      editor.destroy();
      editor = createTestEditor("<p>Original</p>");

      const originalContent = editor.getHTML();
      expect(originalContent).toBe("<p>Original</p>");

      // Make a change - this creates a new history point
      executeCommand(editor, {
        type: "insertText",
        text: "New ",
        target: "documentStart",
      });

      expect(editor.getHTML()).not.toBe(originalContent);
      expect(editor.getHTML()).toContain("<p>New </p><p>Original</p>");

      // Undo should return to original content
      const undoCommand: EditorCommand = {
        type: "undo",
      };

      const result = executeCommand(editor, undoCommand);

      expect(result.success).toBe(true);
      expect(editor.getHTML()).toBe(originalContent);
    });
  });

  describe("redo", () => {
    it("should redo last undone operation", () => {
      // Create editor with initial content to establish history baseline
      editor.destroy();
      editor = createTestEditor("<p>Original</p>");

      const originalContent = editor.getHTML();
      expect(originalContent).toEqual("<p>Original</p>");

      // Make a change - this creates a new history point
      executeCommand(editor, {
        type: "insertText",
        text: "New ",
        target: "documentStart",
      });

      const changedContent = editor.getHTML();
      expect(changedContent).toEqual("<p>New </p><p>Original</p>");

      // Undo should return to original
      executeCommand(editor, { type: "undo" });
      expect(editor.getHTML()).toBe(originalContent);

      // Redo should restore the change
      const redoCommand: EditorCommand = {
        type: "redo",
      };

      const result = executeCommand(editor, redoCommand);

      expect(result.success).toBe(true);
      expect(editor.getHTML()).toBe(changedContent);
    });
  });

  describe("edge cases", () => {
    it("should handle empty document", () => {
      editor.commands.clearContent();

      const command: EditorCommand = {
        type: "insertText",
        text: "Hello",
      };

      const result = executeCommand(editor, command);

      expect(result.success).toBe(true);
      expect(getTextContent(editor)).toContain("Hello");
    });

    it("should handle unknown command type gracefully", () => {
      const command = {
        type: "unknownCommand",
      } as unknown as EditorCommand;

      const result = executeCommand(editor, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown command type");
    });
  });
});
