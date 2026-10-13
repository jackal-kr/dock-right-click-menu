// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Gio from 'gi://Gio';

// GNOME 49 moved DesktopAppInfo to GioUnix and deprecated the Gio alias.
// Use the new class when it exists, without breaking on older shells.
let GioUnix = null;
try {
    GioUnix = (await import('gi://GioUnix?version=2.0')).default;
} catch {
    // GioUnix is not available: fall back to Gio.DesktopAppInfo.
}

/**
 * @param {string} id Desktop file id, e.g. 'org.gnome.Nautilus.desktop'.
 * @returns {?Gio.DesktopAppInfo} The app, or null when it is not installed.
 */
export function lookupDesktopApp(id) {
    return (GioUnix?.DesktopAppInfo ?? Gio.DesktopAppInfo).new(id);
}
