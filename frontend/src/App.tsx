import { useTranscription } from './hooks/useMicVAD'
import './App.css'

function App() {
  const { isListening, transcription, isProcessing, start, pause, errored } = useTranscription();

  return (
    <div className="container">
      <h1>RocketWrite VAD Test</h1>
      
      <div className="status-box">
         <div className={`indicator ${isListening ? 'active' : ''}`}>
            {isListening ? "🔴 Listening" : "⚪️ Idle"}
         </div>
         {isProcessing && <div className="processing">⚡️ Processing...</div>}
         {errored && <div className="error">Error: {JSON.stringify(errored)}</div>}
      </div>

      <div className="controls">
        {!isListening ? (
           <button onClick={start}>Start Microphone</button>
        ) : (
           <button onClick={pause}>Stop Microphone</button>
        )}
      </div>

      <div className="transcription-box">
        <h3>Transcription:</h3>
        <p>{transcription || "Start speaking..."}</p>
      </div>
    </div>
  )
}

export default App

