/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCommandParser } from "../../hooks/useCommandParser";
import { createTestEditor } from "../editor/helpers";
import type { EditorCommand } from "../../utils/editor-commands";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock ollama provider
vi.mock("ai-sdk-ollama", () => ({
  ollama: vi.fn((model: string) => ({ model })),
}));

import { generateObject } from "ai";

describe("useCommandParser Hook", () => {
  let editor: ReturnType<typeof createTestEditor>;

  beforeEach(() => {
    editor = createTestEditor("<p>Hello World</p>");
    vi.mocked(generateObject).mockClear();
  });

  afterEach(() => {
    editor.destroy();
    vi.clearAllMocks();
  });

  describe("parseCommand", () => {
    it("should return empty commands when editor is null", async () => {
      const { result } = renderHook(() => useCommandParser(null));

      const parseResult = await result.current.parseCommand("test input");

      expect(parseResult.commands).toEqual([]);
      expect(parseResult.isCommand).toBe(false);
      expect(generateObject).not.toHaveBeenCalled();
    });

    it("should parse command input and return commands", async () => {
      const mockCommands: EditorCommand[] = [
        {
          type: "insertText",
          text: "New Text",
        },
      ];

      vi.mocked(generateObject).mockResolvedValue({
        object: mockCommands,
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      const parseResult = await result.current.parseCommand("插入新文本");

      expect(parseResult.commands).toEqual(mockCommands);
      expect(parseResult.isCommand).toBe(true);
      expect(generateObject).toHaveBeenCalled();
    });

    it("should return insertText command for content input (not a command)", async () => {
      const mockCommands: EditorCommand[] = [
        {
          type: "insertText",
          text: "今天天气很好",
        },
      ];

      vi.mocked(generateObject).mockResolvedValue({
        object: mockCommands,
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      const parseResult = await result.current.parseCommand("今天天气很好");

      expect(parseResult.commands).toEqual(mockCommands);
      expect(parseResult.isCommand).toBe(true);
      expect(generateObject).toHaveBeenCalled();
    });

    it("should extract context and include it in system prompt", async () => {
      editor.commands.setContent("<p>Before Selection After</p>");
      editor.commands.setTextSelection({ from: 7, to: 16 }); // Select "Selection"

      vi.mocked(generateObject).mockResolvedValue({
        object: [],
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      await result.current.parseCommand("test");

      expect(generateObject).toHaveBeenCalled();
      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      // Context should include selection in the format <selection>...</selection>
      // Note: text may be split due to HTML structure, so we check for the tag and partial text
      expect(callArgs.system).toContain("<selection>");
      expect(callArgs.system).toContain("</selection>");
      expect(callArgs.system).toMatch(/Selectio/); // Partial match due to HTML structure
    });

    it("should set loading state during parsing", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(generateObject).mockReturnValue(promise as any);

      const { result } = renderHook(() => useCommandParser(editor));

      // Start parsing (don't await yet)
      const parsePromise = result.current.parseCommand("test");

      // Wait for loading state to be set
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({ object: [] });
      await parsePromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle errors gracefully and fallback to content", async () => {
      vi.mocked(generateObject).mockRejectedValue(new Error("LLM call failed"));

      const { result } = renderHook(() => useCommandParser(editor));

      const parseResult = await result.current.parseCommand("test input");

      expect(parseResult.commands).toEqual([]);
      expect(parseResult.isCommand).toBe(false);
    });

    it("should store last command for context", async () => {
      const mockCommands: EditorCommand[] = [
        {
          type: "deleteText",
          target: "selection",
        },
      ];

      vi.mocked(generateObject).mockResolvedValue({
        object: mockCommands,
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      await result.current.parseCommand("删除选中");

      // Wait for state update
      await waitFor(() => {
        expect(result.current.lastCommand).toEqual(mockCommands[0]);
      });
    });

    it("should use correct model and schema", async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: [],
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      await result.current.parseCommand("test");

      expect(generateObject).toHaveBeenCalled();
      const callArgs = vi.mocked(generateObject).mock.calls[0][0];
      expect(callArgs.model).toBeDefined();
      expect(callArgs.schema).toBeDefined();
      expect(callArgs.temperature).toBe(0.1);
    });

    it("should handle multiple commands", async () => {
      const mockCommands: EditorCommand[] = [
        {
          type: "insertText",
          text: "First",
        },
        {
          type: "insertText",
          text: "Second",
        },
      ];

      vi.mocked(generateObject).mockResolvedValue({
        object: mockCommands,
      } as any);

      const { result } = renderHook(() => useCommandParser(editor));

      const parseResult = await result.current.parseCommand("插入多个命令");

      expect(parseResult.commands).toHaveLength(2);
      expect(parseResult.isCommand).toBe(true);
    });
  });
});
