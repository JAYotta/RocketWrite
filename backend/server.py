import io
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

import mlx.core as mx
import mlx_whisper
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mlx_whisper.transcribe import ModelHolder
from scipy.io import wavfile

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

MODEL_PATH = "mlx-community/whisper-large-v3-turbo"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warmup the model
    logger.info(f"Probable cached model path: {MODEL_PATH}")
    logger.info("Warming up model to ensure ModelHolder cache is populated...")
    try:
        # Explicitly load the model into memory using ModelHolder
        # This avoids the overhead of generating dummy audio and running a full transcription pipeline
        ModelHolder.get_model(MODEL_PATH, mx.float16)
        logger.info("Model warmup complete. Backend is ready.")
    except Exception as e:
        logger.error(f"Model warmup failed: {e}")

    yield

    # Shutdown logic (if any)
    logger.info("Shutting down...")


app = FastAPI(lifespan=lifespan, title="RocketWrite MLX Backend")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/transcribe")
async def transcribe_endpoint(
    file: UploadFile = File(...),
    language: Optional[str] = Form(
        "zh"
    ),  # Default to Chinese as per RocketWrite context
):
    start_time = time.time()

    try:
        # Read file content into memory
        file_content = await file.read()

        logger.info(
            f"Received audio, size: {len(file_content)} bytes, Language: {language}"
        )

        # Decode WAV from memory
        # scipy.io.wavfile can read from a bytes buffer (io.BytesIO)

        # Read WAV (returns sample_rate and data)
        # Data is typically int16 for the WAVs created by frontend
        try:
            sample_rate, audio_data = wavfile.read(io.BytesIO(file_content))
        except Exception as e:
            logger.error(f"Failed to decode WAV: {e}")
            return {"error": "Invalid WAV file"}

        # MLX Whisper expects:
        # 1. 16kHz
        # 2. float32 in [-1, 1]

        # Resample if needed (Frontend sends 16k, but good to be safe?
        # For max speed, we assume frontend is correct/controlled, or add a quick check)
        if sample_rate != 16000:
            logger.warning(
                f"Input sample rate is {sample_rate}, expected 16000. Re-sampling is skipped for performance (assuming 16k)."
            )

        # Normalize to float32 [-1, 1] if int
        if audio_data.dtype == np.int16:
            audio_data = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio_data = audio_data.astype(np.float32) / 2147483648.0
        elif audio_data.dtype == np.uint8:
            audio_data = (audio_data.astype(np.float32) - 128) / 128.0

        # Ensure it's float32
        if audio_data.dtype == np.float32:
            pass
        elif audio_data.dtype == np.float64:
            audio_data = audio_data.astype(np.float32)
        else:
            return {"error": f"Unsupported audio data type: {audio_data.dtype}"}

        # Transcribe
        # Pass numpy array directly and use parameters to prevent loops/hallucinations
        result = mlx_whisper.transcribe(
            audio_data,
            path_or_hf_repo=MODEL_PATH,
            language=language if language != "auto" else None,
            verbose=False,
            # Prevention of hallucinations:
            condition_on_previous_text=False,  # Sentences are independent
            compression_ratio_threshold=2.4,  # Strict repetition check (default 2.4)
            logprob_threshold=-1.0,  # Discard low confidence (default -1.0)
            no_speech_threshold=0.6,  # Skip if high probability of silence
        )

        text = result.get("text", "").strip()
        processing_time = time.time() - start_time

        logger.info(f"Transcription complete in {processing_time:.2f}s: '{text}'")

        return {
            "text": text,
            "language": result.get("language", "unknown"),
            "processing_time": processing_time,
        }

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"error": str(e)}


@app.get("/health")
def health_check():
    return {"status": "ok", "model": MODEL_PATH}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
