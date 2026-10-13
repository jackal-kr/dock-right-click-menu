// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Show a searchable list of the installed applications.
 *
 * @param {Gtk.Widget} parent Widget the dialog is presented over.
 * @param {(id: string) => void} onChosen Called with the desktop file id of
 *     the application the user picked.
 */
export function chooseApp(parent, onChosen) {
    const dialog = new Adw.Dialog({
        title: _('Choose application'),
        content_width: 440,
        content_height: 600,
    });

    const search = new Gtk.SearchEntry({
        placeholder_text: _('Search applications…'),
        margin_start: 12,
        margin_end: 12,
        margin_top: 12,
        margin_bottom: 6,
    });
    const list = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
        css_classes: ['boxed-list'],
        margin_start: 12,
        margin_end: 12,
        margin_bottom: 12,
    });
    const scroller = new Gtk.ScrolledWindow({
        vexpand: true,
        hscrollbar_policy: Gtk.PolicyType.NEVER,
        child: list,
    });
    const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    content.append(search);
    content.append(scroller);

    const view = new Adw.ToolbarView();
    view.add_top_bar(new Adw.HeaderBar());
    view.set_content(content);
    dialog.set_child(view);

    const apps = Gio.AppInfo.get_all()
        .filter(app => app.should_show())
        .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));
    for (const app of apps) {
        const row = new Adw.ActionRow({
            title: app.get_display_name(),
            use_markup: false,
            activatable: true,
        });
        row.add_prefix(new Gtk.Image({gicon: app.get_icon(), pixel_size: 32}));
        row._appId = app.get_id();
        row._searchKey = `${app.get_display_name()} ${app.get_id()}`.toLowerCase();
        list.append(row);
    }

    let query = '';
    list.set_filter_func(row => query === '' || row._searchKey.includes(query));
    search.connect('search-changed', () => {
        query = search.text.trim().toLowerCase();
        list.invalidate_filter();
    });
    list.connect('row-activated', (_list, row) => {
        const id = row._appId;
        dialog.close();
        onChosen(id);
    });

    dialog.present(parent);
    search.grab_focus();
}
