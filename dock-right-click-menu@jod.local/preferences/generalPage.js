// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {SettingsKey} from '../lib/constants.js';

/** Behaviour options that are not part of the menu content. */
export const GeneralPage = GObject.registerClass({
    GTypeName: 'DockRightClickMenuGeneralPage',
}, class GeneralPage extends Adw.PreferencesPage {
    constructor(settings) {
        super({title: _('General'), icon_name: 'preferences-system-symbolic', name: 'general'});

        const group = new Adw.PreferencesGroup({title: _('Behaviour')});
        this.add(group);

        // Order must match the `launch-mode` enum in the schema.
        const launchModes = new Gtk.StringList();
        launchModes.append(_('Open a new window'));
        launchModes.append(_('Focus the app if it is already running'));
        const launchRow = new Adw.ComboRow({
            title: _('When launching an app'),
            subtitle: _('Apps that cannot open a second window are always focused'),
            model: launchModes,
            selected: settings.get_enum(SettingsKey.LAUNCH_MODE),
        });
        launchRow.connect('notify::selected', row => {
            settings.set_enum(SettingsKey.LAUNCH_MODE, row.selected);
        });
        group.add(launchRow);

        const configureRow = new Adw.SwitchRow({
            title: _('Show “Configure menu…” entry'),
            subtitle: _('Always shown while the menu is empty'),
        });
        settings.bind(SettingsKey.SHOW_CONFIGURE_ENTRY, configureRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(configureRow);
    }
});
