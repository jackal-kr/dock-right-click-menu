# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/). `metadata.json` carries both the
integer `version` (bumped for every release uploaded to extensions.gnome.org) and the
human-readable `version-name`.

## [Unreleased]

### Added
- VS Code workspace (tasks, settings, recommended extensions), EditorConfig, `jsconfig.json` with
  GNOME Shell type definitions for IntelliSense, `CLAUDE.md` project guide.
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
