#!/usr/bin/env bash
# Log + be robust. If something non-critical fails, keep going but log it.
exec > >(tee -a /tmp/postcreate.log) 2>&1
set -euo pipefail
echo "[postcreate] started"

echo "[postcreate] user=$(whoami) home=$HOME"

# Ensure XDG and PATH for uv
export XDG_STATE_HOME="${HOME}/.local/state"
export XDG_CONFIG_HOME="${HOME}/.config"
export XDG_CACHE_HOME="${HOME}/.cache"
mkdir -p "${HOME}/.local/share/uv" "${HOME}/.cache/uv" "${HOME}/.local/bin"

# Put ~/.local/bin on PATH so a user-level uv install is immediately visible
export PATH="${HOME}/.local/bin:${PATH}"

# Ensure uv exists for THIS user (feature may install system-wide, but be safe)
if ! command -v uv >/dev/null 2>&1; then
  echo "[postcreate] uv not found on PATH; installing to ~/.local via unmanaged installer"
  curl -LsSf https://astral.sh/uv/install.sh | env UV_UNMANAGED_INSTALL="${HOME}/.local" sh || echo "[postcreate] WARN: uv install failed, continuing"
  hash -r || true
fi

command -v uv >/dev/null 2>&1 && uv --version || echo "[postcreate] WARN: uv still not available"

# Install specify-cli idempotently (don’t fail the whole script if network flakes)
if command -v uv >/dev/null 2>&1; then
  if ! uv tool list 2>/dev/null | awk '{print $1}' | grep -qx 'specify-cli'; then
    echo "[postcreate] installing specify-cli via uv"
    uv tool install specify-cli --from git+https://github.com/github/spec-kit.git || echo "[postcreate] WARN: specify-cli install failed"
  else
    echo "[postcreate] specify-cli already installed"
  fi
else
  echo "[postcreate] WARN: skipping specify-cli (uv missing)"
fi

# Node toolchain + deps (don’t block the whole run on pnpm issues)
echo "[postcreate] enabling corepack/pnpm"
corepack enable || echo "[postcreate] WARN: corepack enable failed"
corepack prepare pnpm@latest --activate || echo "[postcreate] WARN: corepack prepare pnpm failed"

if [ -f package.json ]; then
  echo "[postcreate] installing node deps"
  pnpm install --frozen-lockfile || pnpm install || echo "[postcreate] WARN: pnpm install failed"
fi

echo "[postcreate] nx init (no-op if already)"
npx -y nx@latest init --interactive false || echo "[postcreate] WARN: nx init failed (probably already initialized)"

echo "[postcreate] sanity"
command -v claude >/dev/null 2>&1 && claude --version || echo "[postcreate] note: claude CLI may be provided by extension"
command -v uv >/dev/null 2>&1 && uv --version || echo "[postcreate] note: uv still not on PATH (check /tmp/postcreate.log)"
uv tool list || true

echo "[postcreate] done"
