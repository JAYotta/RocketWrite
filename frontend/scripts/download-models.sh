#!/bin/bash
# Script to download all models required for benchmarking
# Uses 'parallel' + 'tmux' to show concurrent download progress bars in split panes.

set -e

MODELS=(
  "qwen2.5-coder:0.5b"
  "qwen2.5-coder:1.5b"
  "qwen2.5-coder:3b"
  "qwen2.5-coder:7b"
  "deepseek-coder:1.3b"
  "deepseek-coder:6.7b"
  "llama3.2:1b"
  "llama3.2:3b"

  # Recommended Non-Coder Models
  "qwen2.5:1.5b"
  "qwen2.5:3b"      # Strongest small Chinese model
  "qwen2.5:7b"
  "qwen3:0.6b"
  "qwen3:1.7b"
  "qwen3:4b"
)

# 1. Check/Auto-start Tmux
# This script relies on tmux split-window features.
if [ -z "$TMUX" ]; then
  echo "⚠️  This script requires tmux for the split-view interface."
  echo "🚀 Launching new tmux session..."
  # -A: Attach to existing session if it exists, or create new
  # exec: Replace the current shell
  exec tmux new-session -A -s download-models "$0" "$@"
fi

# 2. Check for GNU Parallel
if ! command -v parallel &> /dev/null; then
  echo "Error: GNU Parallel is not installed."
  echo "Run: brew install parallel"
  exit 1
fi

echo "🚀 Starting Parallel Model Download (Jobs: 2)..."
echo "=================================================================================="

# 3. Execute Parallel Downloads
# The logic inside single quotes is executed by 'parallel' for each model.
# - PID=$(...): Spawns a new tmux pane running the download command and captures its PID.
# - tmux select-layout tiled: Rearranges panes so all are visible.
# - while kill -0 $PID...: Blocks the 'parallel' job until the pane closes.

parallel -j 2 '
  # Spawn pane
  PID=$(tmux split-window -P -F "#{pane_pid}" "echo \"Preparing {}\...\"; ollama pull {}; echo \"✅ Done {}\"; sleep 1")
  
  # Organize layout
  tmux select-layout even-vertical
  
  # Wait for pane to close
  while kill -0 $PID 2>/dev/null; do sleep 0.5; done
  
  # Re-organize layout after closure
  tmux select-layout even-vertical
  
' ::: "${MODELS[@]}"

echo ""
echo "=================================================================================="
echo "🎉 All downloads processed."
# Optional: Keep session open if desired, or let it exit (if created by exec)
