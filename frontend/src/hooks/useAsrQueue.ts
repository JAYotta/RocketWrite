import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { toast } from "sonner";

import type { EditorCommand } from "../utils/editor-commands";
import { executeCommand } from "../utils/commandExecutor";

const STORAGE_KEY = "rocketwrite_asr_queue_v1";
const MAX_QUEUE_ITEMS = 50;

export type AsrQueueStatus = "pending" | "processing" | "done" | "error";

export interface AsrQueueItem {
  id: string;
  text: string;
  createdAt: number;
  status: AsrQueueStatus;
  llmResultSummary?: string;
  error?: string;
}

export interface EnqueueResult {
  ok: boolean;
  reason?: "queue_full";
}

export interface UseAsrQueueResult {
  queue: AsrQueueItem[];
  enqueue: (text: string) => EnqueueResult;
}

type ParseCommandResult = {
  commands: EditorCommand[];
  isCommand: boolean;
};

type ParseCommandFn = (text: string) => Promise<ParseCommandResult>;

function loadInitialQueue(): AsrQueueItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as AsrQueueItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function useAsrQueue(
  editor: Editor | null,
  parseCommand: ParseCommandFn,
): UseAsrQueueResult {
  const [queue, setQueue] = useState<AsrQueueItem[]>(() => loadInitialQueue());
  const [isProcessing, setIsProcessing] = useState(false);

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      // Persistence failure shouldn't break the app; log for debugging only.
      console.warn("[ASR Queue] Failed to persist queue:", error);
    }
  }, [queue]);

  const enqueue = useCallback(
    (text: string): EnqueueResult => {
      // Enforce max queue length
      if (queue.length >= MAX_QUEUE_ITEMS) {
        console.warn(
          "[ASR Queue] Queue is full, rejecting new item. Length:",
          queue.length,
        );
        return { ok: false, reason: "queue_full" };
      }

      const now = Date.now();
      const newItem: AsrQueueItem = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        createdAt: now,
        status: "pending",
      };

      setQueue((prev) => [...prev, newItem]);
      console.log("[ASR Queue] Enqueued item", newItem.id, newItem.text);

      return { ok: true };
    },
    [queue.length],
  );

  // Serial processor: always process at most one pending item at a time
  useEffect(() => {
    if (isProcessing) return;
    if (!editor) return;

    const next = queue.find((item) => item.status === "pending");
    if (!next) return;

    let cancelled = false;

    const processNext = async () => {
      setIsProcessing(true);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === next.id ? { ...item, status: "processing" } : item,
        ),
      );

      console.log("[ASR Queue] start", next.id, next.text);

      try {
        const { commands, isCommand } = await parseCommand(next.text);

        let llmResultSummary = "plain text";
        if (isCommand && commands.length > 0) {
          const uniqueTypes = Array.from(
            new Set(commands.map((cmd) => cmd.type)),
          );
          llmResultSummary = `commands: ${uniqueTypes.join(", ")}`;
        }

        let successCount = 0;

        if (isCommand && commands.length > 0) {
          for (const cmd of commands) {
            const result = executeCommand(editor, cmd);
            if (result.success) {
              successCount += 1;
            }
          }
        }

        console.log(
          "[ASR Queue] llm result",
          next.id,
          llmResultSummary,
          "successCount:",
          successCount,
        );

        if (!cancelled) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === next.id
                ? {
                    ...item,
                    status: "done",
                    llmResultSummary,
                  }
                : item,
            ),
          );
        }
      } catch (error) {
        console.error("[ASR Queue] processing error", next.id, error);
        const message =
          error instanceof Error
            ? error.message
            : "Unknown error during LLM processing.";

        if (!cancelled) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === next.id
                ? {
                    ...item,
                    status: "error",
                    error: message,
                  }
                : item,
            ),
          );
        }

        toast.error("语音指令处理失败", {
          description: message,
        });
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    void processNext();

    return () => {
      cancelled = true;
    };
  }, [queue, isProcessing, editor, parseCommand]);

  return {
    queue,
    enqueue,
  };
}
