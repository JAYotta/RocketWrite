import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranscription } from './hooks/useMicVAD';
import './App.css';

function App() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start speaking to transcribe...</p>',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Callback to insert text into editor when VAD transcribes
  const handleTranscription = (text: string) => {
    if (editor && text) {
      // Insert text at current cursor position (or end if no focus)
      // Add a space after for readability
      editor.commands.insertContent(text + ' ');
      // Scroll to view if needed? Tiptap usually handles this on focus
    }
  };

  const { isListening, isProcessing, start, pause, errored } = useTranscription(
    {
      language: 'zh',
      onTranscription: handleTranscription,
    }
  );

  return (
    <div className="container">
      <h1>RocketWrite</h1>

      {/* Status Bar */}
      <div className="status-bar">
        <div
          className={`status-indicator ${isListening ? 'listening' : 'idle'}`}
        >
          {isListening ? '🔴 Listening...' : '⚪️ Idle'}
        </div>
        {isProcessing && (
          <div className="status-processing">⚡️ Processing...</div>
        )}
        {errored && (
          <div className="status-error">Error: {JSON.stringify(errored)}</div>
        )}

        <div className="controls">
          {!isListening ? (
            <button onClick={start} className="btn-primary">
              Start Mic
            </button>
          ) : (
            <button onClick={pause} className="btn-secondary">
              Stop Mic
            </button>
          )}
        </div>
      </div>

      {/* Tiptap Editor Area */}
      <div className="editor-container">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default App;
