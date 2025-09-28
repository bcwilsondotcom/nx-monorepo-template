#!/usr/bin/env bash
set -euo pipefail
echo "[oncreate] started"

echo "[oncreate] installing claude CLI (global)"
if command -v npm >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code@latest || echo "[oncreate] WARN: npm install failed, continuing"
else
  echo "[oncreate] WARN: npm not found, skipping claude CLI"
fi

echo "[oncreate] ensuring vscode home dirs exist"
mkdir -p /home/vscode/.local/state /home/vscode/.config /home/vscode/.cache \
         /home/vscode/.local/share/uv /home/vscode/.cache/uv || true
chown -R vscode:vscode /home/vscode/.local /home/vscode/.config /home/vscode/.cache || true

echo "[oncreate] sanity"
command -v claude >/dev/null 2>&1 && claude --version || echo "[oncreate] claude not on PATH (will still work via VS Code extension)"
command -v uv >/dev/null 2>&1 && uv --version || echo "[oncreate] uv not on PATH here (feature should expose for vscode user)"

echo "[oncreate] done"