#!/bin/bash
set -e

echo "🚀 Starting RocketWrite Backend Setup for macOS..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first."
    exit 1
fi

echo "📦 Installing system dependencies..."
brew install portaudio openblas python@3.11

echo "ℹ️  Using Python 3.11 to ensure binary wheels are available (skips compilation)"

echo "🐍 Creating Python 3.11 virtual environment..."
cd backend
rm -rf venv
/opt/homebrew/bin/python3.11 -m venv venv

echo "📥 Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Setup complete! You can now run the server with:"
echo "   source backend/venv/bin/activate && python backend/server.py"
