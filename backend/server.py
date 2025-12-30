import os
import time
import shutil
import logging
import mlx_whisper
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("RocketWrite-Backend")

app = FastAPI(title="RocketWrite MLX Backend")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model Configuration
MODEL_PATH = "mlx-community/whisper-large-v3-turbo" # Default optimized model
TEMP_DIR = "temp_audio"

os.makedirs(TEMP_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """
    Warmup the model on startup.
    This ensures the model weights are loaded into Unified Memory.
    """
    logger.info(f"Loading MLX Whisper Model: {MODEL_PATH}")
    try:
        # Simple warmup with dummy audio or just letting the library handle lazy loading logic
        # For now, we trust mlx-whisper to load on first call, or we can force a load here.
        # Let's log that we are ready.
        logger.info("Backend ready to transcribe.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Receives an audio file (wav/webm/etc) and returns the transcribed text.
    """
    start_time = time.time()
    file_location = os.path.join(TEMP_DIR, file.filename)
    
    try:
        # Save uploaded file
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        logger.info(f"Received file: {file.filename}, Size: {os.path.getsize(file_location)} bytes")

        # Transcribe using MLX
        # Note: verbose=False to keep stdout clean
        result = mlx_whisper.transcribe(
            file_location,
            path_or_hf_repo=MODEL_PATH,
            verbose=False,
            language="zh" # Default to Chinese for this project
        )
        
        text = result.get("text", "").strip()
        duration = time.time() - start_time
        
        logger.info(f"Transcription complete in {duration:.2f}s: '{text}'")
        
        return {
            "text": text,
            "language": result.get("language"),
            "processing_time": duration
        }

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup
        if os.path.exists(file_location):
            os.remove(file_location)

@app.get("/health")
async def health_check():
    return {"status": "ok", "backend": "mlx-whisper"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
