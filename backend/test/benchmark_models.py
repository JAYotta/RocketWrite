import time
import numpy as np
import mlx_whisper
import datetime

MODELS = [
    "mlx-community/whisper-large-v3-turbo",
    "mlx-community/distil-whisper-large-v3", # Should be much faster
    "mlx-community/whisper-small-mlx",
    "mlx-community/whisper-tiny-mlx",
]

def run_benchmark():
    print(f"--- Model Comparison Benchmark ({datetime.datetime.now()}) ---")
    print("Conditions: 10s Audio, Language='en' (Forced)")
    
    audio_10s = np.random.uniform(-0.1, 0.1, 16000 * 10).astype(np.float32)

    for model_path in MODELS:
        print(f"\n[Testing Model: {model_path}]")
        try:
            # 1. Warmup (and download if needed)
            print("  Warming up...")
            start = time.time()
            mlx_whisper.transcribe(audio_10s, path_or_hf_repo=model_path, language="en", verbose=False)
            print(f"  Warmup Time: {time.time() - start:.2f}s")
            
            # 2. Real Run
            print("  Running measurement...")
            start = time.time()
            mlx_whisper.transcribe(audio_10s, path_or_hf_repo=model_path, language="en", verbose=False)
            duration = time.time() - start
            print(f"  > Latency: {duration:.4f}s")
            
            if duration < 1.0:
                print("  ✅ SUB-SECOND ACHIEVED!")
        except Exception as e:
            print(f"  ❌ Failed: {e}")

if __name__ == "__main__":
    run_benchmark()
