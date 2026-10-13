# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/). `metadata.json` carries the
human-readable `version-name`; the integer `version` is set by extensions.gnome.org on upload.

## [Unreleased]

## [1.3.0] - 2026-10-13

### Added
- **Run as administrator**, chosen app by app (off for every app by default): hold <kbd>Ctrl</kbd>
  while choosing a flagged app in the menu. Flagged entries show *Name (as admin)* while Ctrl is held.
  Terminal emulators open on a `sudo -i` shell, command-line apps run with `sudo` in the default
  terminal, Files opens `admin:///`, other apps run through `pkexec`. A password prompt always appears.
- An *Allow running as administrator* shield button on every app row (Menu page), stored as an
  optional `"admin": true` on the app item. There is no global switch.
- Polish and Ukrainian translations of the new strings; unit tests for the command builder.

### Fixed
- `make uninstall` no longer deletes the working tree when the extension was linked with
  `make link`; it only removes the link.

### Changed
- `metadata.json` no longer has the deprecated `version` key (extensions.gnome.org sets it) and its
  description mentions the per-app administrator option.

## [1.2.0] - 2026-10-13

### Added
- *Developer* row on the About page, and a screenshot in the README.
- VS Code workspace (tasks, settings, recommended extensions), EditorConfig, `jsconfig.json` with
  GNOME Shell type definitions for IntelliSense, `CLAUDE.md` project guide.
- `make setup` / `scripts/setup-dev.sh [--run]`: one-shot dev environment (packages, npm, link,
  enable, tests) and optional nested-shell launch.
- `docs/DEVELOPMENT.md`: complete setup, test and debug guide; `make doctor` checks the machine
  (including the `mutter-dev-bin` package needed by `make nested`).
- `make link` / `make unlink` to run the working tree directly from GNOME Shell.

## [1.1.1] - 2026-10-13

### Changed
- The *Configure menu…* entry now has a settings icon.

## [1.1.0] - 2026-10-13

### Added
- **Launch behaviour** option: open a new window, or focus the app if it is already running.
- **About** page in the preferences (version, license, compatible docks, homepage).
- Polish and Ukrainian translations.
- Unit tests for the menu data model (`make test`), ESLint configuration (`make lint`).
- `README.md`, `LICENSE` (GPL-3.0-or-later), `CHANGELOG.md`, `Makefile`.

### Changed
- Split the code into modules: `lib/` (click detection, popup menu, data model) and
  `preferences/` (one file per preferences page).
- The menu data model is validated when read: malformed entries, unknown types and submenus
  nested inside submenus are ignored instead of breaking the menu.
- Use `GioUnix.DesktopAppInfo` on GNOME 49+ (falls back to `Gio.DesktopAppInfo`).
- Preferences are organised in three pages: Menu, General, About.

### Fixed
- Right-click was not detected on GNOME 50, where `event.get_source()` returns `null` for
  captured stage events. The clicked actor is now looked up with `Clutter.Stage.get_event_actor()`.
- The menu teardown idle callback is now cancelled when the extension is disabled.

## [1.0.0] - 2026-10-13

### Added
- Right-click on empty space of the Ubuntu Dock opens a menu of user-selected apps.
- Separators and one level of submenus.
- Preferences window to add, remove and reorder entries.
