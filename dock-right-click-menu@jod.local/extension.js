// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {SettingsKey} from './lib/constants.js';
import {DockClickWatcher} from './lib/dockClick.js';
import {DockMenu} from './lib/dockMenu.js';
import {parseItems, resolveItems} from './lib/menuModel.js';

/**
 * Dock Right-Click Menu: a configurable menu for a right-click on empty
 * space of the Ubuntu Dock. This class only wires the pieces together:
 *
 *   lib/dockClick.js  detects the click
 *   lib/menuModel.js  turns the stored setting into menu entries
 *   lib/dockMenu.js   shows the popup menu, launches apps
 *   lib/adminLaunch.js  runs an app as administrator (Ctrl held; see adminCommand.js)
 */
export default class DockRightClickMenuExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._menu = new DockMenu({openPreferences: () => this.openPreferences()});
        this._watcher = new DockClickWatcher({
            onSecondaryClick: (dock, x, y) => this._showMenu(dock, x, y),
            isSuppressed: () => this._menu.isOpen,
        });
        this._watcher.enable();
    }

    disable() {
        this._watcher?.destroy();
        this._watcher = null;
        this._menu?.destroy();
        this._menu = null;
        this._settings = null;
    }

    _showMenu(dock, x, y) {
        // Read the settings on every click: edits made in the preferences
        // apply immediately, without reloading the extension.
        const appSystem = Shell.AppSystem.get_default();
        const entries = resolveItems(
            parseItems(this._settings.get_string(SettingsKey.ITEMS)),
            id => appSystem.lookup_app(id));

        this._menu.open(dock, x, y, entries, {
            // An empty menu would be invisible, so always offer the way to configure it.
            showConfigure: entries.length === 0 || this._settings.get_boolean(SettingsKey.SHOW_CONFIGURE_ENTRY),
            launchMode: this._settings.get_enum(SettingsKey.LAUNCH_MODE),
        });
    }
}
