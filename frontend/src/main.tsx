import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  // Disable strict mode according to https://github.com/ricky0123/vad/issues/242
  // <StrictMode>
  <>
    <Toaster position="top-center" richColors />
    <App />
  </>,
  // </StrictMode>,
);
