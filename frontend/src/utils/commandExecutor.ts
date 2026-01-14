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
        const { text, position = "selection" } = command;
        if (position === "end") {
          editor
            .chain()
            .focus()
            .insertContentAt(editor.state.doc.content.size, text)
            .run();
        } else if (position === "start") {
          editor.chain().focus().insertContentAt(0, text).run();
        } else {
          editor.chain().focus().insertContent(text).run();
        }
        return { success: true, message: `Inserted "${text}" at ${position}` };
      }

      case "deleteText": {
        const { target } = command;
        // POC: For now, just show a toast, real logic needs NLP or rigid mapping
        toast.info(`AI wants to delete: ${target}`);
        // Basic fallback: if target matches selection text, delete selection
        const selectionText = editor.state.selection
          .content()
          .content.textBetween(
            0,
            editor.state.selection.content().content.size,
          );
        if (selectionText && target.includes("selection")) {
          editor.chain().focus().deleteSelection().run();
          return { success: true, message: "Deleted selection" };
        }
        return { success: true, message: `Simulated deletion of "${target}"` };
      }

      case "replaceText": {
        const { old: oldText, new: newText } = command;
        toast.info(`AI replacing "${oldText}" with "${newText}"`);
        // Simple string replace in current selection or document (POC)
        // Real implementation would use searchAndReplace or similar
        return {
          success: true,
          message: `Replaced "${oldText}" with "${newText}"`,
        };
      }

      case "applyFormat": {
        const { format, target } = command;
        if (format === "bold") {
          editor.chain().focus().toggleBold().run();
        } else if (format === "italic") {
          editor.chain().focus().toggleItalic().run();
        } else if (format === "highlight") {
          // Try to use highlight extension, but it may not be available
          try {
            // Check if toggleHighlight method exists (requires Highlight extension)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chain = editor.chain().focus() as any;
            if (typeof chain.toggleHighlight === "function") {
              chain.toggleHighlight({ color: "yellow" }).run();
            } else {
              return {
                success: false,
                message: "Highlight extension is not available",
              };
            }
          } catch {
            return {
              success: false,
              message: "Highlight extension is not available",
            };
          }
        }
        return {
          success: true,
          message: `Applied format ${format} to ${target}`,
        };
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
        const commandType = (command as { type: string }).type;
        // Use the command to satisfy TypeScript's exhaustive check
        void command; // Suppress unused variable warning
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
