// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

/**
 * Constants shared by the shell side (extension.js) and the preferences
 * side (prefs.js). This module must stay free of `gi://` imports.
 */

/** GSettings keys, see schemas/*.gschema.xml. */
export const SettingsKey = Object.freeze({
    ITEMS: 'items',
    LAUNCH_MODE: 'launch-mode',
    SHOW_CONFIGURE_ENTRY: 'show-settings-item',
    ADMIN_MODE: 'admin-mode',
});

/** Mirrors the `launch-mode` enum of the schema (the order matters). */
export const LaunchMode = Object.freeze({
    NEW_WINDOW: 0,
    FOCUS_OR_LAUNCH: 1,
});
