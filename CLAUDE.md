# Dock Right-Click Menu: project guide

GNOME Shell extension (ES modules, GNOME 49/50): right-click on empty Ubuntu Dock space opens a
user-configured menu of apps, separators and one level of submenus. See `README.md` for users,
this file for working on the code.

## Layout

- `dock-right-click-menu@jod.local/` is the extension (the folder that gets zipped).
  - `extension.js` wires things up; `prefs.js` builds the preferences window.
  - `lib/dockClick.js` click detection, `lib/dockMenu.js` popup menu, `lib/menuModel.js` data model
    (pure JS, no `gi://`, unit tested), `lib/constants.js` shared keys.
  - `lib/adminCommand.js` (pure, unit tested) builds the command that runs an app as administrator;
    `lib/adminLaunch.js` gathers the inputs and spawns it (Ctrl-held feature, `admin-mode` setting).
  - `preferences/` one file per preferences page, plus the app chooser.
  - `schemas/` GSettings schema. `locale/` is generated (git-ignored).
- `po/` translations (`pl`, `uk`). `tests/` Node tests for `lib/menuModel.js`.

## Commands

- `make test`, `make lint` (run `npm install` once for ESLint and types)
- `make zip` builds `dist/*.zip`; `make link` symlinks the tree into GNOME Shell; `make nested`
  runs a throw-away shell to try changes without logging out.
- `make pot` refreshes translations (needs gettext).

## Rules

- Shell-side files (`extension.js`, `lib/dock*.js`) never import Gtk/Adw/Gdk; preferences files never
  import Clutter/Shell/St or `ui/*.js`. `lib/menuModel.js` and `lib/constants.js` import nothing from `gi://`.
- Everything created in `enable()` is destroyed in `disable()` (signals, idle sources, actors).
- GNOME Shell caches extension modules until the next login: test code changes in `make nested`.
- Do not trust `event.get_source()` on stage events; use `global.stage.get_event_actor(event)`.
- User-visible strings go through `_()`; run `make pot` and update `po/*.po` when they change.
- Keep the stored `items` JSON format backward compatible (it is user data).
- Administrator mode: never use bare `sudo` without a terminal, never run through a shell, never store
  or pass a password; privileged commands go through `pkexec` (extensions.gnome.org review rule) or
  `sudo` inside a terminal. Keep it opt-in (`admin-mode` off by default, per-app `admin` flag).
- Release: update `CHANGELOG.md`, bump `version-name` in `metadata.json` and `version` in
  `package.json` (no `version` key in `metadata.json`), run `make test lint zip`.
- Style: 4 spaces, single quotes, semicolons (enforced by ESLint and `.editorconfig`).
