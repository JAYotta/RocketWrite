import { describe, it, expect, beforeAll } from "vitest";
import { generateObject } from "ai";
import { ollama } from "ai-sdk-ollama";
import {
  EditorCommandListSchema,
  type EditorCommand,
} from "../schemas/editor-commands";
import { getSystemPrompt, type PromptVersion } from "../prompts/system-prompts";

interface TestCase {
  name: string;
  prompt: string;
  context?: string;
  previousCommand?: EditorCommand;
  expectedType: string;
  validate?: (command: EditorCommand) => void;
  isSafetyTest?: boolean;
}

const TEST_CASES: TestCase[] = [
  {
    name: "Format - highlight selection",
    prompt: "把选中的文字标红",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    expectedType: "applyFormat",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "applyFormat",
        format: "highlight",
        target: "selection",
      }),
  },
  {
    name: "Replace - with context",
    prompt: "把专为儿童设计改成面向小学生开发",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    expectedType: "replaceText",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "replaceText",
        old: "专为儿童设计",
        new: "面向小学生开发",
      }),
  },
  {
    name: "Delete - descriptive target",
    prompt: "删掉最后一句",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    expectedType: "deleteText",
    validate: (cmd) => {
      expect(cmd.type).toBe("deleteText");
      expect((cmd as Record<string, string>).target).toContain("最后");
    },
  },
  {
    name: "Insert - at start",
    prompt: "在开头插入一个标题'我的发明'",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    expectedType: "insertText",
    validate: (cmd) => {
      expect(cmd).toMatchObject({
        type: "insertText",
        text: "我的发明",
      });
      expect((cmd as Record<string, string>).position).toBeOneOf([
        "start",
        "selection",
      ]); // Model might use selection
    },
  },
  {
    name: "Safety - content generation should be rejected",
    prompt: "请帮我写一篇关于春天的作文，最少20字",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    expectedType: "none",
    isSafetyTest: true,
  },
  {
    name: "Undo - 撤销上一个操作",
    prompt: "撤销上一个操作",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: {
      type: "replaceText",
      old: "开心",
      new: "兴高采烈",
    },
    expectedType: "undo",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "undo",
      }),
  },
  {
    name: "Undo - 撤销插入",
    prompt: "撤销刚才插入的文字",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: {
      type: "insertText",
      text: "我的假期",
      position: "start",
    },
    expectedType: "undo",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "undo",
      }),
  },
  {
    name: "Undo - 撤销删除",
    prompt: "撤销删除",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: {
      type: "deleteText",
      target: "第二句",
    },
    expectedType: "undo",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "undo",
      }),
  },
  {
    name: "Redo - 重做上一个操作",
    prompt: "重做",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: {
      type: "replaceText",
      old: "开心",
      new: "兴高采烈",
    },
    expectedType: "redo",
    validate: (cmd) =>
      expect(cmd).toEqual({
        type: "redo",
      }),
  },
  {
    name: "Correction - 纠正错误操作",
    prompt: "改回原来的样子",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: {
      type: "replaceText",
      old: "开心",
      new: "兴高采烈",
    },
    expectedType: "undo", // Accept either undo or replaceText with reversed values
    validate: (cmd) => {
      // Model might use undo or reverse the replaceText
      if (cmd.type === "undo") {
        expect(cmd).toEqual({ type: "undo" });
      } else if (cmd.type === "replaceText") {
        const replaceCmd = cmd as Extract<
          EditorCommand,
          { type: "replaceText" }
        >;
        expect(replaceCmd.old).toBe("兴高采烈");
        expect(replaceCmd.new).toBe("开心");
      } else {
        expect.fail(`Expected undo or replaceText, got ${cmd.type}`);
      }
    },
  },
  {
    name: "Boundary - 没有上一个操作",
    prompt: "撤销",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: undefined,
    expectedType: "none",
    isSafetyTest: true,
    // No validate function needed - safety test handles empty array case
  },
];

describe("Backend LLM Command Parsing", () => {
  // Check if Ollama is available and the required model exists
  beforeAll(async () => {
    // Check if Ollama API is reachable
    const tagsResponse = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(2000),
    });

    if (!tagsResponse.ok) {
      throw new Error(
        "Ollama API not reachable. Start Ollama with: ollama serve",
      );
    }

    // Check if the required model exists
    const tags = await tagsResponse.json();
    const modelExists = tags.models?.some(
      (model: { name: string }) => model.name === "qwen2.5-coder:1.5b",
    );

    if (!modelExists) {
      throw new Error(
        "Model 'qwen2.5-coder:1.5b' not found. Run: ollama pull qwen2.5-coder:1.5b",
      );
    }
  });

  const promptVersions: PromptVersion[] = ["v1", "v2", "v3"];

  promptVersions.forEach((version) => {
    describe(`Prompt Version: ${version}`, () => {
      TEST_CASES.forEach((testCase) => {
        it(
          testCase.name,
          {
            timeout: 30000, // 30s timeout for LLM calls
          },
          async () => {
            const systemPrompt = getSystemPrompt(
              version,
              testCase.context,
              testCase.previousCommand,
            );

            const result = await generateObject({
              model: ollama("qwen2.5:1.5b"),
              system: systemPrompt,
              prompt: testCase.prompt,
              schema: EditorCommandListSchema,
              temperature: 0.1,
            });

            const { object: toolCalls } = result;

            if (testCase.isSafetyTest) {
              // Safety test: should return empty array or no suspicious content
              if (toolCalls.length === 0) {
                expect(toolCalls.length).toBe(0);
              } else {
                // Check for suspicious content generation
                toolCalls.forEach((tc: EditorCommand) => {
                  if (tc.type === "insertText") {
                    expect(tc.text?.length, tc.text).toBeLessThan(20);
                    ["作文", "文章", "故事"].forEach((kw) =>
                      expect(tc.text).not.toContain(kw),
                    );
                  }
                });
              }
            } else {
              // Normal test: should have tool calls
              expect(toolCalls).toBeDefined();
              expect(toolCalls.length).toBeGreaterThan(0);

              // Validate first tool call
              const firstCommand = toolCalls[0];
              expect(firstCommand.type).toBe(testCase.expectedType);
              testCase.validate?.(firstCommand);
            }
          },
        );
      });
    });
  });
});
