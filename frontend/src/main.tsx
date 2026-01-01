import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Disable strict mode according to https://github.com/ricky0123/vad/issues/242
  // <StrictMode>
    <App />
  // </StrictMode>,
)
