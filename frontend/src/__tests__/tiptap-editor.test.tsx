import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * Unit tests for Tiptap Editor commands
 *
 * These tests verify that editor commands work correctly without rendering.
 * For full React component tests, see component-specific test files.
 */

describe("Tiptap Editor Commands", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit],
      content: "<p>Hello World</p>",
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it("should initialize with content", () => {
    expect(editor.getHTML()).toBe("<p>Hello World</p>");
  });

  it("should insert text at cursor", () => {
    editor.commands.insertContent("New Text");
    expect(editor.getHTML()).toContain("New Text");
  });

  it("should apply bold format", () => {
    editor.chain().focus().setBold().run();
    editor.commands.insertContent("Bold Text");
    expect(editor.getHTML()).toContain("<strong>");
  });

  it("should delete selected text", () => {
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(editor.getHTML()).toBe("<p></p>");
  });

  it("should replace text", () => {
    editor.commands.selectAll();
    editor.commands.insertContent("Replaced");
    expect(editor.getHTML()).toContain("Replaced");
  });
});
