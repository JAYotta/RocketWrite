## Environment Setup

### 1. Python Version

- **Requirement**: Python >= **3.10** (MLX requirement).
- **Recommended**: Python **3.11** or **3.12** is currently the most stable for ML libraries on macOS.
- **Optimized**: Native Apple Silicon Python is preferred (e.g., from macOS system or Homebrew `brew install python`).

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

To provide the token with huggingface-cli:

```bash
brew install huggingface-cli
hf auth login
```

### 4. Running Tests

We use `pytest` for unit testing.

**Run all tests with coverage:**

```bash
source .venv/bin/activate
python -m pytest backend/test/test_server.py --cov=backend.server --cov-report=term-missing
```
