#!/usr/bin/env bash
# Reel Studio installer for macOS / Linux. Paste into Terminal:
#   curl -fsSL https://raw.githubusercontent.com/AwaisZulfqar/reel-studio/main/install.sh | bash
set -e
DIR="$HOME/.claude/skills/reel"
REPO="https://github.com/AwaisZulfqar/reel-studio"

if ! command -v git >/dev/null; then
  if command -v brew >/dev/null; then brew install git
  else echo "Install git first (Mac: xcode-select --install | Ubuntu: sudo apt install git), then run this again."; exit 1; fi
fi

if [ -d "$DIR/.git" ]; then
  echo "Updating $DIR"; git -C "$DIR" pull --ff-only
else
  echo "Downloading Reel Studio to $DIR"
  mkdir -p "$(dirname "$DIR")"
  git clone "$REPO" "$DIR"
fi

bash "$DIR/setup.sh"
