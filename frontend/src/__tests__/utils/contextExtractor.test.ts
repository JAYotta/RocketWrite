/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractContext } from "../../utils/contextExtractor";
import { createTestEditor } from "../editor/helpers";

describe("Context Extractor", () => {
  let editor: ReturnType<typeof createTestEditor>;

  beforeEach(() => {
    editor = createTestEditor("<p></p>");
  });

  afterEach(() => {
    editor.destroy();
  });

  describe("extractContext", () => {
    it("should extract empty context from empty editor", () => {
      const context = extractContext(editor);

      expect(context.selection).toBe("");
      expect(context.before).toBe("");
      expect(context.after).toBe("");
      expect(context.full).toBe("<selection></selection>");
    });

    it("should extract selection text", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.setTextSelection({ from: 0, to: 5 }); // Select "Hello"

      const context = extractContext(editor);

      expect(context.selection).toBe("Hello");
      expect(context.full).toContain("<selection>Hello</selection>");
    });

    it("should extract context with sliding window (default 1000 chars)", () => {
      // Create a long document
      const longText = "A".repeat(2000);
      editor.commands.setContent(`<p>${longText}</p>`);
      // Select text in the middle
      editor.commands.setTextSelection({ from: 1000, to: 1005 });

      const context = extractContext(editor);

      expect(context.selection).toBe("AAAAA");
      // Should have context before and after (500 chars each side by default)
      expect(context.before.length).toBeGreaterThan(0);
      expect(context.after.length).toBeGreaterThan(0);
      expect(context.full).toContain("<selection>AAAAA</selection>");
    });

    it("should extract context with custom window size", () => {
      const text = "Before " + "X".repeat(100) + " Selection " + "Y".repeat(100) + " After";
      editor.commands.setContent(`<p>${text}</p>`);
      // Select "Selection"
      const selectionStart = text.indexOf("Selection");
      editor.commands.setTextSelection({
        from: selectionStart,
        to: selectionStart + "Selection".length,
      });

      const context = extractContext(editor, 50); // Small window: 25 chars each side

      expect(context.selection).toBe("Selection");
      expect(context.before.length).toBeLessThanOrEqual(25);
      expect(context.after.length).toBeLessThanOrEqual(25);
    });

    it("should handle selection at document start", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.setTextSelection({ from: 0, to: 5 }); // Select "Hello"

      const context = extractContext(editor);

      expect(context.selection).toBe("Hello");
      expect(context.before).toBe(""); // No text before start
      expect(context.after.length).toBeGreaterThan(0);
      expect(context.full).toContain("<selection>Hello</selection>");
    });

    it("should handle selection at document end", () => {
      editor.commands.setContent("<p>Hello World</p>");
      const docSize = editor.state.doc.content.size;
      editor.commands.setTextSelection({ from: docSize - 5, to: docSize }); // Select "World"

      const context = extractContext(editor);

      expect(context.selection).toBe("World");
      expect(context.before.length).toBeGreaterThan(0);
      expect(context.after).toBe(""); // No text after end
      expect(context.full).toContain("<selection>World</selection>");
    });

    it("should format full context string correctly", () => {
      editor.commands.setContent("<p>Before Selection After</p>");
      editor.commands.setTextSelection({ from: 7, to: 16 }); // Select "Selection"

      const context = extractContext(editor);

      expect(context.full).toContain("<selection>Selection</selection>");
      expect(context.full).toMatch(/.*<selection>Selection</selection>.*/);
    });

    it("should handle empty selection (cursor position)", () => {
      editor.commands.setContent("<p>Hello World</p>");
      editor.commands.setTextSelection({ from: 5, to: 5 }); // Cursor position, no selection

      const context = extractContext(editor);

      expect(context.selection).toBe("");
      expect(context.full).toContain("<selection></selection>");
    });
  });
});
