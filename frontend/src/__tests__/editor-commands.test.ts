import { describe, it, expect } from "vitest";
import {
  EditorCommandSchema,
  InsertTextSchema,
  DeleteTextSchema,
  ReplaceTextSchema,
  ApplyFormatSchema,
} from "../schemas/editor-commands";

describe("Editor Commands Schema", () => {
  describe("InsertTextSchema", () => {
    it("should validate correct insertText command with target", () => {
      const valid = {
        type: "insertText",
        text: "Hello",
        target: "documentStart",
      };
      expect(() => InsertTextSchema.parse(valid)).not.toThrow();
    });

    it("should allow insertText without target (optional)", () => {
      const withoutTarget = {
        type: "insertText",
        text: "Hello",
      };
      const parsed = InsertTextSchema.parse(withoutTarget);
      expect(parsed.target).toBeUndefined();
    });

    it("should reject invalid target", () => {
      const invalid = {
        type: "insertText",
        text: "Hello",
        target: "invalid",
      };
      expect(() => InsertTextSchema.parse(invalid)).toThrow();
    });
  });

  describe("DeleteTextSchema", () => {
    it("should validate correct deleteText command with selection", () => {
      const valid = {
        type: "deleteText",
        target: "selection",
      };
      expect(() => DeleteTextSchema.parse(valid)).not.toThrow();
    });

    it("should accept range target", () => {
      const valid = {
        type: "deleteText",
        target: { from: 10, to: 20 },
      };
      expect(() => DeleteTextSchema.parse(valid)).not.toThrow();
    });

    it("should reject descriptive string target", () => {
      const invalid = {
        type: "deleteText",
        target: "第一段",
      };
      expect(() => DeleteTextSchema.parse(invalid)).toThrow();
    });
  });

  describe("ReplaceTextSchema", () => {
    it("should validate correct replaceText command", () => {
      const valid = {
        type: "replaceText",
        old: "开心",
        new: "兴高采烈",
      };
      expect(() => ReplaceTextSchema.parse(valid)).not.toThrow();
    });

    it("should require old field", () => {
      const invalid = {
        type: "replaceText",
        new: "兴高采烈",
      };
      expect(() => ReplaceTextSchema.parse(invalid)).toThrow();
    });
  });

  describe("ApplyFormatSchema", () => {
    it("should validate correct applyFormat command", () => {
      const valid = {
        type: "applyFormat",
        format: "bold",
        target: "selection",
      };
      expect(() => ApplyFormatSchema.parse(valid)).not.toThrow();
    });

    it("should accept all format types", () => {
      const formats = ["bold", "italic", "highlight"];
      formats.forEach((format) => {
        const valid = {
          type: "applyFormat",
          format,
          target: "selection",
        };
        expect(() => ApplyFormatSchema.parse(valid)).not.toThrow();
      });
    });

    it("should reject invalid format", () => {
      const invalid = {
        type: "applyFormat",
        format: "underline",
        target: "selection",
      };
      expect(() => ApplyFormatSchema.parse(invalid)).toThrow();
    });
  });

  describe("EditorCommandSchema (Discriminated Union)", () => {
    it("should validate insertText command", () => {
      const cmd = {
        type: "insertText",
        text: "Hello",
        target: "documentStart",
      };
      expect(() => EditorCommandSchema.parse(cmd)).not.toThrow();
    });

    it("should validate deleteText command", () => {
      const cmd = {
        type: "deleteText",
        target: { from: 10, to: 20 },
      };
      expect(() => EditorCommandSchema.parse(cmd)).not.toThrow();
    });

    it("should validate replaceText command", () => {
      const cmd = {
        type: "replaceText",
        old: "开心",
        new: "兴高采烈",
      };
      expect(() => EditorCommandSchema.parse(cmd)).not.toThrow();
    });

    it("should validate applyFormat command", () => {
      const cmd = {
        type: "applyFormat",
        format: "highlight",
        target: "selection",
      };
      expect(() => EditorCommandSchema.parse(cmd)).not.toThrow();
    });

    it("should reject invalid type", () => {
      const invalid = {
        type: "invalidType",
        text: "Hello",
      };
      expect(() => EditorCommandSchema.parse(invalid)).toThrow();
    });
  });
});
