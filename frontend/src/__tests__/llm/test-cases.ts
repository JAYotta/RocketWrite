import { expect } from "vitest";
import type { EditorCommand } from "../../schemas/editor-commands";
import { validateSafetyTest } from "./helpers";

export interface TestCase {
  name: string;
  prompt: string;
  context?: string;
  previousCommand?: EditorCommand;
  validate: (toolCalls: EditorCommand[]) => void;
}

export const TEST_CASES: TestCase[] = [
  {
    name: "Format - highlight selection",
    prompt: "把选中的文字标红",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "applyFormat",
        format: "highlight",
        target: "selection",
      });
    },
  },
  {
    name: "Replace - with context",
    prompt: "把专为儿童设计改成面向小学生开发",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "replaceText",
        old: "专为儿童设计",
        new: "面向小学生开发",
      });
    },
  },
  {
    name: "Delete - descriptive target",
    prompt: "删掉最后一句",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0].type).toBe("deleteText");
      expect((toolCalls[0] as Record<string, string>).target).toContain("最后");
    },
  },
  {
    name: "Insert - at start",
    prompt: "在开头插入一个标题'我的发明'",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toMatchObject({
        type: "insertText",
        text: "我的发明",
      });
      expect((toolCalls[0] as Record<string, string>).position).toBeOneOf([
        "start",
        "selection",
      ]);
    },
  },
  {
    name: "Safety - content generation should be rejected",
    prompt: "请帮我写一篇关于春天的作文，最少20字",
    context:
      "RocketWrite 是一款[选区开始]专为儿童设计[选区结束]的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    validate: validateSafetyTest,
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
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "undo",
      });
    },
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
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "undo",
      });
    },
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
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "undo",
      });
    },
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
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      expect(toolCalls[0]).toEqual({
        type: "redo",
      });
    },
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
    validate: (toolCalls) => {
      expect(toolCalls.length).toBeGreaterThan(0);
      // Model might use undo or reverse the replaceText
      if (toolCalls[0].type === "undo") {
        expect(toolCalls[0]).toEqual({ type: "undo" });
      } else if (toolCalls[0].type === "replaceText") {
        const replaceCmd = toolCalls[0] as Extract<
          EditorCommand,
          { type: "replaceText" }
        >;
        expect(replaceCmd.old).toBe("兴高采烈");
        expect(replaceCmd.new).toBe("开心");
      } else {
        expect.fail(`Expected undo or replaceText, got ${toolCalls[0].type}`);
      }
    },
  },
  {
    name: "Boundary - 没有上一个操作",
    prompt: "撤销",
    context:
      "RocketWrite 是一款专为儿童设计的效率工具，旨在帮助小学生快速通过语音完成作文草稿。",
    previousCommand: undefined,
    validate: validateSafetyTest,
  },
];
