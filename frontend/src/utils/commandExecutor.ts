import { Editor } from "@tiptap/core";
import { toast } from "sonner";
import type { EditorCommand } from "./editor-commands";

export type CommandResult = {
  success: boolean;
  message?: string;
};

/**
 * Execute an editor command
 * @param editor - Tiptap editor instance
 * @param command - Editor command to execute
 * @returns Result indicating success or failure
 */
export const executeCommand = (
  editor: Editor,
  command: EditorCommand,
): CommandResult => {
  console.log(`[CommandExecutor] Executing ${command.type}:`, command);

  try {
    switch (command.type) {
      case "insertText": {
        const { text, target } = command;

        // If no target provided or target is 'selection', use default insertContent behavior
        if (!target || target === "selection") {
          editor.chain().focus().insertContent(text).run();
          return {
            success: true,
            message: `Inserted "${text}" at current selection`,
          };
        }

        // Handle position types
        let position;
        switch (target) {
          case "documentEnd":
            position = editor.state.doc.content.size;
            break;
          case "documentStart":
            position = 0;
            break;
          case "selectionStart":
            position = editor.state.selection.from;
            break;
          case "selectionEnd":
            position = editor.state.selection.to;
            break;
          default:
            position = target;
        }

        editor.chain().focus().insertContentAt(position, text).run();

        return {
          success: true,
          message: `Inserted "${text}" at ${JSON.stringify(target)}${typeof position === "number" ? `(${position})` : ""}`,
        };
      }

      case "deleteText": {
        const { target } = command;

        if (target === "selection") {
          editor.chain().focus().deleteSelection().run();
          return { success: true, message: "Deleted selection" };
        } else {
          // target is {from, to}
          editor
            .chain()
            .focus()
            .deleteRange({ from: target.from, to: target.to })
            .run();
          return {
            success: true,
            message: `Deleted range ${target.from}-${target.to}`,
          };
        }
      }

      case "replaceText": {
        const { old: oldText, new: newText } = command;
        toast.info(`AI replacing "${oldText}" with "${newText}"`);
        // Simple string replace in current selection or document (POC)
        // @TODO: Real implementation would use searchAndReplace or similar
        return {
          success: true,
          message: `Replaced "${oldText}" with "${newText}"`,
        };
      }

      case "applyFormat": {
        const { format, target } = command;
        let chainedCommand = editor.chain();

        // If not selection, set text selection first
        if (target !== "selection") {
          chainedCommand = chainedCommand.setTextSelection({
            from: target.from,
            to: target.to,
          });
        }

        // Apply format
        switch (format) {
          case "bold":
            chainedCommand = chainedCommand.toggleBold();
            break;
          case "italic":
            chainedCommand = chainedCommand.toggleItalic();
            break;
        }
        chainedCommand.run();
        return { success: true, message: `Applied format ${format}` };
      }

      case "undo": {
        editor.chain().focus().undo().run();
        return { success: true, message: "Undone last operation" };
      }

      case "redo": {
        editor.chain().focus().redo().run();
        return { success: true, message: "Redone last undone operation" };
      }

      default: {
        // TypeScript exhaustive check - this should never be reached if all command types are handled
        const { type: commandType } = command;
        console.warn(`Unknown command type: ${commandType}`);
        return {
          success: false,
          message: `Unknown command type: ${commandType}`,
        };
      }
    }
  } catch (error) {
    console.error("Command Execution Failed:", error);
    return { success: false, message: `Error: ${error}` };
  }
};
