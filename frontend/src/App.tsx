import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

import { useMicVAD } from "@ricky0123/vad-react";
import axios from "axios";
import { Button } from "@heroui/react";
import {
  Microphone,
  MicrophoneSpeaking,
  Pause,
  Play,
  Square,
} from "iconoir-react";
import { toast } from "sonner";

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

  // Transcription upload logic
  const uploadAudio = async (audio: Float32Array) => {
    try {
      const wavBlob = float32ToWav(audio);
      const file = new File([wavBlob], "audio.wav", { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", "zh");

      const response = await axios.post(BACKEND_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data && response.data.text) {
        const text = response.data.text.trim();
        // Insert into Editor directly
        if (editor && text) {
          editor
            .chain()
            .insertContent(text + " ")
            .run();
        }
      }
    } catch (e: any) {
      toast.error("Transcription failed", {
        description: e.message || "Unknown error",
      });
    }
  };

  const { listening, userSpeaking, start, pause } = useMicVAD({
    baseAssetPath: "/",
    onnxWASMBasePath: "/",
    model: "v5",
    // Tuning for better response
    positiveSpeechThreshold: 0.6, // Default 0.5. Higher = harder to start (less false positives)
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
        <Button
          variant={listening ? "primary" : "secondary"}
          onPress={listening ? pause : start}
          isIconOnly
          size="lg"
          aria-label={listening ? "Stop Recording" : "Start Recording"}
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

// Helpers
function float32ToWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 16000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return new Blob([view], { type: "audio/wav" });
}
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
  }
}

export default App;
