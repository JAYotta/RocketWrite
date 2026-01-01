import { useState } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import axios from 'axios';

interface UseMicVADReturn {
  isListening: boolean;
  transcription: string;
  isProcessing: boolean;
  start: () => void;
  pause: () => void;
  errored: any;
}

const BACKEND_URL = 'http://localhost:8000/transcribe';

interface UseTranscriptionOptions {
  language?: string;
  onTranscription?: (text: string) => void;
}

export function useTranscription({
  language = 'zh',
  onTranscription,
}: UseTranscriptionOptions = {}): UseMicVADReturn {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const vad = useMicVAD({
    baseAssetPath: '/',
    onnxWASMBasePath: '/',
    model: 'v5',
    // positiveSpeechThreshold: 0.6,
    startOnLoad: false,
    onSpeechEnd: async (audio: Float32Array) => {
      setIsProcessing(true);
      console.log('Speech ended, processing audio...');

      try {
        // Convert Float32Array to WAV Blob
        const wavBlob = float32ToWav(audio);
        const file = new File([wavBlob], 'audio.wav', { type: 'audio/wav' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language);

        const response = await axios.post(BACKEND_URL, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data && response.data.text) {
          const newText = response.data.text.trim();
          console.log('Transcribed:', newText);

          if (newText) {
            setTranscription((prev) => (prev ? prev + ' ' + newText : newText));
            if (onTranscription) {
              onTranscription(newText);
            }
          }
        }
      } catch (error) {
        console.error('Transcription error:', error);
      } finally {
        setIsProcessing(false);
      }
    },
  });

  return {
    isListening: vad.listening,
    transcription,
    isProcessing,
    start: vad.start,
    pause: vad.pause,
    errored: vad.errored,
  };
}

// Helper: Convert Float32Array to WAV Blob
function float32ToWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, 16000, true); // Sample rate (VAD default is 16kHz)
  view.setUint32(28, 16000 * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write samples
  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
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
