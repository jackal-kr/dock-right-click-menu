// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {AboutPage} from './preferences/aboutPage.js';
import {GeneralPage} from './preferences/generalPage.js';
import {MenuPage} from './preferences/menuPage.js';

export default class DockRightClickMenuPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Keep the settings object alive as long as the window.
        window._settings = this.getSettings();

        window.set_default_size(640, 720);
        window.set_search_enabled(true);
        window.add(new MenuPage(window._settings));
        window.add(new GeneralPage(window._settings));
        window.add(new AboutPage(this.metadata));
    }
}
