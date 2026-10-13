#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)
#
# Checks that this machine can build, test and run the extension. Read-only.
# Usage: make doctor     (exit status 1 if a required item is missing)

UUID=dock-right-click-menu@jod.local
cd "$(dirname "$0")/.." || exit 1

fail=0
ok()   { printf '  \033[32mok\033[0m    %s\n' "$1"; }
miss() { printf '  \033[31mMISSING\033[0m %s\n         -> %s\n' "$1" "$2"; fail=1; }
warn() { printf '  \033[33mwarn\033[0m  %s\n         -> %s\n' "$1" "$2"; }

need() { # command, apt package
    if command -v "$1" >/dev/null 2>&1; then ok "$1"; else miss "$1" "sudo apt install $2"; fi
}

echo "Build and test tools"
need make make
need zip zip
need msgfmt gettext
need glib-compile-schemas libglib2.0-bin
need gnome-extensions gnome-shell
need node nodejs
need npm npm
if [ -d node_modules/.bin ] && [ -x node_modules/.bin/eslint ]; then ok "eslint (node_modules)"
else miss "eslint" "npm install"; fi

echo "Nested shell"
if [ -x /usr/libexec/mutter-devkit ]; then ok "/usr/libexec/mutter-devkit"
else miss "/usr/libexec/mutter-devkit" "sudo apt install mutter-dev-bin"; fi
need dbus-run-session dbus-daemon
need gnome-shell gnome-shell

echo "Session"
if [ "${XDG_SESSION_TYPE:-}" = wayland ]; then ok "Wayland session"
else warn "session type is '${XDG_SESSION_TYPE:-unknown}'" "the nested shell needs a graphical session; Wayland recommended"; fi
if command -v gnome-shell >/dev/null 2>&1; then
    echo "  info  $(gnome-shell --version)"
fi

echo "Extension"
link="$HOME/.local/share/gnome-shell/extensions/$UUID"
if [ -L "$link" ]; then ok "linked to the working tree ($(readlink "$link"))"
elif [ -e "$link" ]; then warn "a real copy is installed" "make uninstall && make link   (a real copy hides your edits)"
else warn "not linked" "make link"; fi
if command -v gnome-extensions >/dev/null 2>&1; then
    if gnome-extensions list --enabled 2>/dev/null | grep -qx "$UUID"; then ok "enabled"
    else warn "not enabled" "gnome-extensions enable $UUID   (needs one login after the first make link)"; fi
fi

echo
if [ $fail -eq 0 ]; then echo "Ready: make test, make link, make nested."; else echo "Fix the MISSING items above."; fi
exit $fail
