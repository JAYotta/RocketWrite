import time
import numpy as np
import mlx_whisper

def run_benchmark():
    print("--- MLX Deep Dive Benchmark ---")
    model_path = "mlx-community/whisper-large-v3-turbo"
    
    # Pre-warm
    print("Warming up...")
    dummy = np.random.uniform(-0.1, 0.1, 16000 * 1).astype(np.float32)
    mlx_whisper.transcribe(dummy, path_or_hf_repo=model_path, verbose=False)

    # 1. 10s Audio (Auto Language)
    print("\n[Test 1] 10s Audio - Auto Language Detection")
    audio_10s = np.random.uniform(-0.1, 0.1, 16000 * 10).astype(np.float32)
    start = time.time()
    mlx_whisper.transcribe(audio_10s, path_or_hf_repo=model_path, verbose=False)
    print(f"Duration: {time.time() - start:.4f}s")

    # 2. 10s Audio (Forced Language)
    print("\n[Test 2] 10s Audio - Forced Language='en'")
    start = time.time()
    mlx_whisper.transcribe(audio_10s, path_or_hf_repo=model_path, language="en", verbose=False)
    print(f"Duration: {time.time() - start:.4f}s")
    
    # 3. 20s Audio (Forced Language)
    print("\n[Test 3] 20s Audio - Forced Language='en'")
    audio_20s = np.random.uniform(-0.1, 0.1, 16000 * 20).astype(np.float32)
    start = time.time()
    mlx_whisper.transcribe(audio_20s, path_or_hf_repo=model_path, language="en", verbose=False)
    print(f"Duration: {time.time() - start:.4f}s")
    
    print("\nBenchmark Complete.")

if __name__ == "__main__":
    run_benchmark()
