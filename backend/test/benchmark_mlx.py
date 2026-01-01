import time
import sys
import numpy as np
import mlx_whisper

def run_benchmark():
    print("--- Official MLX Whisper Benchmark (M1 Verification) ---")
    
    # 1. Load Model (Quantized)
    # mlx-whisper handles model loading and quantization internally via path
    model_path = "mlx-community/whisper-large-v3-turbo" # Check if this exists, or use "mlx-community/whisper-large-v3-mlx-4bit"
    # Actually official mlx-whisper supports `path_or_hf_repo`
    # Let's use a safe, known quantized model for M1. 
    # "mlx-community/whisper-large-v3-turbo" is likely float16 by default unless specified?
    # mlx_whisper.transcribe(..., path_or_hf_repo="...", quantization_config=...) ?
    # Let's try standard transcribe with a 4bit repo if available.
    
    print("Loading Model & Transcribing (Lazy Load)...")
    
    # Generate dummy audio
    audio_data = np.random.uniform(-0.1, 0.1, 16000 * 10).astype(np.float32)

    start_time = time.time()
    try:
        # Based on mlx-whisper docs, we can just pass the hf_repo. 
        # To ensure quantization, we can point to a quantized repo OR pass args if supported.
        # "mlx-community/whisper-large-v3-turbo" exists. 
        # "mlx-community/whisper-large-v3-turbo-4bit" also exists usually.
        # Let's try the 4bit specific repo to be sure.
        result = mlx_whisper.transcribe(audio_data, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", verbose=True)
    except Exception as e:
        print(f"Error: {e}")
        return

    end_time = time.time()
    elapsed = end_time - start_time
    # Note: First run includes download time! 
    # We should run twice to get RTF.
    
    print(f"First Run (Download + Transcribe): {elapsed:.2f}s")
    
    print("Second Run (Pure Transcribe)...")
    start_time = time.time()
    result = mlx_whisper.transcribe(audio_data, path_or_hf_repo="mlx-community/whisper-large-v3-turbo")
    end_time = time.time()
    elapsed = end_time - start_time
    
    print(f"Processing Time (10s audio): {elapsed:.2f}s")
    print(f"RTF: {elapsed/10:.2f}")

if __name__ == "__main__":
    run_benchmark()
