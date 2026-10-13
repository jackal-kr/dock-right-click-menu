// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DEVELOPER = 'JOD (Oleksiy Degtyar)';
const DEVELOPER_URL = 'https://github.com/jackal-kr';

/** Developer, version, license, homepage and compatibility information. */
export const AboutPage = GObject.registerClass({
    GTypeName: 'DockRightClickMenuAboutPage',
}, class AboutPage extends Adw.PreferencesPage {
    constructor(metadata) {
        super({title: _('About'), icon_name: 'help-about-symbolic', name: 'about'});

        const group = new Adw.PreferencesGroup({title: metadata.name});
        this.add(group);

        const developer = new Adw.ActionRow({
            title: _('Developer'),
            subtitle: DEVELOPER,
            use_markup: false,
        });
        developer.add_suffix(new Gtk.LinkButton({
            uri: DEVELOPER_URL,
            label: _('Open'),
            valign: Gtk.Align.CENTER,
        }));
        group.add(developer);
        group.add(new Adw.ActionRow({
            title: _('Version'),
            subtitle: metadata['version-name'] ?? String(metadata.version),
        }));
        group.add(new Adw.ActionRow({
            title: _('License'),
            subtitle: 'GPL-3.0-or-later',
        }));
        group.add(new Adw.ActionRow({
            title: _('Compatible docks'),
            subtitle: _('Ubuntu Dock and Dash to Dock'),
        }));

        if (metadata.url) {
            const homepage = new Adw.ActionRow({
                title: _('Homepage'),
                subtitle: metadata.url,
                use_markup: false,
            });
            homepage.add_suffix(new Gtk.LinkButton({
                uri: metadata.url,
                label: _('Open'),
                valign: Gtk.Align.CENTER,
            }));
            group.add(homepage);
        }
    }
});
