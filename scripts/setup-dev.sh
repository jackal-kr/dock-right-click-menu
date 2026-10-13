#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)
#
# One-shot preparation of the development / test / sandbox environment on Ubuntu (and other
# apt based distributions): packages, npm tooling, the linked extension, and the settings the
# "Mutter Development Kit" nested shell needs.
#
#   ./scripts/setup-dev.sh          prepare everything
#   ./scripts/setup-dev.sh --run    prepare, then open the nested GNOME Shell window
#
# Safe to run repeatedly. Asks for your password once (sudo apt install).

set -euo pipefail

UUID=dock-right-click-menu@jod.local
PACKAGES=(git make zip gettext libglib2.0-bin nodejs npm gnome-shell mutter-dev-bin dbus-daemon)
EXT_LINK="$HOME/.local/share/gnome-shell/extensions/$UUID"

cd "$(dirname "$0")/.."
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

run=0
case "${1:-}" in
    --run) run=1 ;;
    "") ;;
    *) echo "usage: $0 [--run]"; exit 2 ;;
esac

if [ "$(id -u)" -eq 0 ]; then
    echo "Run this as your normal user, not root (it configures your GNOME session)."; exit 1
fi

step "1/6 System packages"
if command -v apt-get >/dev/null 2>&1; then
    missing=()
    for p in "${PACKAGES[@]}"; do
        dpkg -s "$p" >/dev/null 2>&1 || missing+=("$p")
    done
    if [ ${#missing[@]} -gt 0 ]; then
        echo "Installing: ${missing[*]}"
        sudo apt-get install -y "${missing[@]}"
    else
        echo "All packages already installed."
    fi
else
    echo "apt-get not found. Install the equivalents of: ${PACKAGES[*]}"
    echo "See docs/DEVELOPMENT.md; then continue with: npm install && make link && make nested"
    exit 1
fi
[ -x /usr/libexec/mutter-devkit ] || { echo "mutter-devkit is still missing; cannot open the nested window."; exit 1; }

step "2/6 JavaScript tooling (ESLint, GNOME Shell type definitions)"
npm install --no-audit --no-fund

step "3/6 Link the working tree into GNOME Shell"
if [ -e "$EXT_LINK" ] && [ ! -L "$EXT_LINK" ]; then
    echo "A real (zip) install hides your edits; removing it."
    rm -rf "$EXT_LINK"
fi
make link

step "4/6 Enable the extension (no logout needed for the nested shell)"
# `gnome-extensions enable` only works for extensions the running shell already knows, so write
# the setting directly. The nested shell is a fresh process: it finds the linked folder and
# reads this key. Your real session picks the extension up at its next login.
current=$(gsettings get org.gnome.shell enabled-extensions)
if [[ "$current" == *"'$UUID'"* ]]; then
    echo "Already in enabled-extensions."
else
    if [ "$current" = "@as []" ] || [ "$current" = "[]" ]; then
        new="['$UUID']"
    else
        new="${current%]}, '$UUID']"
    fi
    gsettings set org.gnome.shell enabled-extensions "$new"
    echo "Added to enabled-extensions."
fi
gsettings set org.gnome.shell disable-user-extensions false

step "5/6 Unit tests and lint"
make test
make lint

step "6/6 Environment check"
make doctor || true

cat <<'DONE'

Ready.
  Open the nested GNOME Shell window:   make nested     (VS Code task: Nested shell)
  Right-click empty space on the dock inside that window.
  Watch errors:                          journalctl -f -o cat /usr/bin/gnome-shell
DONE

if [ "$run" -eq 1 ]; then
    step "Starting the nested shell (close the window to stop it)"
    exec make nested
fi
