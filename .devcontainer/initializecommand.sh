#!/usr/bin/env bash
set -euo pipefail
echo "[initializecommand] started"

chmod +x .devcontainer/oncreatecommand.sh || true
chmod +x .devcontainer/postcreatecommand.sh || true

echo "[initializecommand] done"