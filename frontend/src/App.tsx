import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

import { useMicVAD, utils } from "@ricky0123/vad-react";
import axios from "axios";
import { Button } from "@heroui/react";
import { Microphone, MicrophoneSpeaking, Pause, Play } from "iconoir-react";
import { toast } from "sonner";
import { useCommandParser } from "./hooks/useCommandParser";
import { useAsrQueue } from "./hooks/useAsrQueue";

const BACKEND_URL = "http://localhost:8000/transcribe";

function App() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        // Use a placeholder:
        placeholder: "Start speaking to transcribe...",
      }),
    ],
  });

  // Command parser hook
  const { parseCommand, isLoading: isParsing } = useCommandParser(editor);

  // ASR queue hook: manages transcription items and serial LLM processing
  const { queue, enqueue } = useAsrQueue(editor as any, parseCommand);

  // Transcription and intent detection logic
  const uploadAudio = async (audio: Float32Array) => {
    try {
      // 1. ASR transcription
      // Use VAD library's built-in WAV encoder (returns ArrayBuffer)
      const wavBuffer = utils.encodeWAV(audio);
      const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
      const file = new File([wavBlob], "audio.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", "zh");

      const response = await axios.post(BACKEND_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data || !response.data.text) {
        return;
      }

      const transcribedText = response.data.text.trim();
      if (!transcribedText || !editor) {
        return;
      }

      // 2. 将转录文本加入队列，由队列统一负责 LLM 解析和命令执行
      const enqueueResult = enqueue(transcribedText);
      if (!enqueueResult.ok && enqueueResult.reason === "queue_full") {
        // 队列已满：暂停录音并提示用户
        pause();
        toast.warning("队列已满（50/50），已暂停录音", {
          description: "请处理或清理队列后再继续录音。",
        });
      }
    } catch (e) {
      console.error("[App] Audio processing failed:", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      toast.error("Audio processing failed", {
        description: errorMessage,
      });
    }
  };

  const { listening, userSpeaking, start, pause } = useMicVAD({
    baseAssetPath: "/",
    onnxWASMBasePath: "/",
    model: "v5",
    // Tuning for better response
    positiveSpeechThreshold: 0.4, // Default 0.5. Higher = harder to start (less false positives)
    negativeSpeechThreshold: 0.5, // Default 0.35. Higher = easier to stop (cuts silence faster)
    startOnLoad: false,
    onSpeechEnd: (audio) => {
      uploadAudio(audio);
    },
  });

  return (
    <div className="relative">
      <EditorContent
        editor={editor}
        className="mx-auto max-w-4xl p-6 text-lg"
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-4">
        {/* Loading indicator when parsing command */}
        {isParsing && (
          <div className="bg-primary/20 text-primary rounded-full px-4 py-2 text-sm">
            正在解析指令...
          </div>
        )}

        <Button
          variant={listening ? "primary" : "secondary"}
          onPress={listening ? pause : start}
          isIconOnly
          size="lg"
          aria-label={listening ? "Stop Recording" : "Start Recording"}
          isDisabled={isParsing}
        >
          {({ isHovered }) =>
            !listening ? (
              isHovered ? (
                <Play className="h-1/2 w-1/2" />
              ) : (
                <Microphone className="h-1/2 w-1/2" />
              )
            ) : isHovered ? (
              <Pause className="h-1/2 w-1/2" />
            ) : userSpeaking ? (
              <MicrophoneSpeaking className="h-1/2 w-1/2" />
            ) : (
              <Microphone className="h-1/2 w-1/2" />
            )
          }
        </Button>
      </div>
    </div>
  );
}

export default App;
