## Environment Setup

### 1. Python Version
*   **Requirement**: Python >= **3.10** (MLX requirement).
*   **Recommended**: Python **3.11** or **3.12** is currently the most stable for ML libraries on macOS.
*   **Optimized**: Native Apple Silicon Python is preferred (e.g., from macOS system or Homebrew `brew install python`).

### 2. Virtual Environment (Recommended)

It is best practice to use a virtual environment (`venv`) to isolate dependencies.

**Create and Activate:**
```bash
# Create venv in the current directory (hidden .venv folder recommended)
python3 -m venv .venv

# Activate it
source .venv/bin/activate
```

**Install Dependencies:**
```bash
pip install -r requirements.txt
```

### 3. MLX & Token Setup


Some models (like `pyannote/segmentation` or gated Whisper models) require a Hugging Face Token found at https://huggingface.co/settings/tokens.

To provide the token **without modifying the code**:

1.  **Create a .env file**:
    ```bash
    cp .env.example .env
    ```
2.  **Edit .env** and paste your token:
    ```
    HF_TOKEN=hf_xxxxxxxxxxxxxxxxx
    ```
3.  **Run the script** with environment variables loaded:

    **Recommended (Shell-native):**
    Use `set -a` to automatically export variables defined in `.env`:
    ```bash
    # Run from the backend/test directory:
    (set -a; source .env; set +a; python server.py)
    ```

    *Alternative (Manual export):*
    ```bash
    export HF_TOKEN=hf_xxxxxxxxxxxxxxxxx
    python server.py
    ```
