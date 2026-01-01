#!/bin/bash
set -e

echo "🚀 Starting RocketWrite Backend Setup for macOS..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first."
    exit 1
fi

echo "📦 Installing system dependencies..."
brew install portaudio openblas

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10+."
    exit 1
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)

if [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -ge 10 ]; then
    echo "✅ Found Python $PY_VERSION (>= 3.10)"
else
    echo "❌ Python version $PY_VERSION is too old. Please install Python 3.10 or newer."
    echo "   Recommended: brew install python"
    exit 1
fi

echo "🐍 Creating virtual environment..."
rm -rf .venv
python3 -m venv .venv

echo "📥 Installing Python dependencies..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "✅ Setup complete! You can now run the server with:"
echo "   source .venv/bin/activate && python backend/server.py"
