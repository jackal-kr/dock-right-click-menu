// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {SettingsKey} from '../lib/constants.js';
import {
    ItemType, createApp, createSeparator, createSubmenu, moveItem, parseItems, serializeItems,
} from '../lib/menuModel.js';
import {chooseApp} from './appChooser.js';
import {lookupDesktopApp} from './appInfo.js';

/**
 * The menu editor: a list of apps, separators and submenus (one level deep)
 * that can be reordered, removed and extended. Every change is written to
 * GSettings straight away.
 */
export const MenuPage = GObject.registerClass({
    GTypeName: 'DockRightClickMenuMenuPage',
}, class MenuPage extends Adw.PreferencesPage {
    constructor(settings) {
        super({title: _('Menu'), icon_name: 'view-list-symbolic', name: 'menu'});

        this._settings = settings;
        this._items = parseItems(settings.get_string(SettingsKey.ITEMS));
        this._widgets = [];
        this._expanded = new Set(); // submenu items shown expanded, kept across rebuilds
        this._adminMode = settings.get_boolean(SettingsKey.ADMIN_MODE);

        this._group = new Adw.PreferencesGroup({
            title: _('Menu items'),
            description: _('Shown when you right-click empty space on the dock. A submenu can hold apps and separators.'),
        });
        this.add(this._group);
        this._rebuild();

        // The per-app "administrator" switches only exist while administrator mode is on.
        const handlerId = settings.connect(`changed::${SettingsKey.ADMIN_MODE}`, () => {
            this._adminMode = settings.get_boolean(SettingsKey.ADMIN_MODE);
            this._rebuild();
        });
        this.connect('unrealize', () => settings.disconnect(handlerId));
    }

    _save() {
        this._settings.set_string(SettingsKey.ITEMS, serializeItems(this._items));
    }

    /** Re-create all rows from `this._items`. */
    _rebuild() {
        for (const widget of this._widgets)
            this._group.remove(widget);
        this._widgets = [];

        const add = widget => {
            this._group.add(widget);
            this._widgets.push(widget);
        };
        this._buildRows(this._items, add, false);
        add(this._buildAddBar(this._items, true));
    }

    /**
     * @param {object[]} list Items to show.
     * @param {(widget: Gtk.Widget) => void} add Adds a row to its container.
     * @param {boolean} nested True inside a submenu.
     */
    _buildRows(list, add, nested) {
        list.forEach((item, index) => {
            if (item.type === ItemType.SUBMENU && !nested)
                add(this._buildSubmenuRow(list, index, item));
            else if (item.type === ItemType.SEPARATOR)
                add(this._buildSeparatorRow(list, index));
            else if (item.type === ItemType.APP)
                add(this._buildAppRow(list, index, item));
        });
    }

    _buildAppRow(list, index, item) {
        const info = lookupDesktopApp(item.id);
        const row = new Adw.ActionRow({
            title: info ? info.get_display_name() : item.id,
            use_markup: false,
        });
        const updateSubtitle = () => {
            if (!info)
                row.subtitle = _('Not installed');
            else
                row.subtitle = this._adminMode && item.admin ? _('Hold Ctrl in the menu to run this app as administrator') : '';
        };
        updateSubtitle();
        row.add_prefix(new Gtk.Image({
            gicon: info?.get_icon() ?? new Gio.ThemedIcon({name: 'application-x-executable'}),
            pixel_size: 32,
        }));
        if (this._adminMode && info) {
            const toggle = new Gtk.ToggleButton({
                icon_name: 'security-high-symbolic',
                tooltip_text: _('Allow running as administrator'),
                active: item.admin === true,
                css_classes: ['flat'],
                valign: Gtk.Align.CENTER,
            });
            toggle.connect('toggled', () => {
                if (toggle.active)
                    item.admin = true;
                else
                    delete item.admin;
                updateSubtitle();
                this._save();
            });
            row.add_suffix(toggle);
        }
        row.add_suffix(this._buildControls(list, index));
        return row;
    }

    _buildSeparatorRow(list, index) {
        const row = new Adw.ActionRow({title: _('— Separator —'), use_markup: false});
        row.add_css_class('dim-label');
        row.add_suffix(this._buildControls(list, index));
        return row;
    }

    _buildSubmenuRow(list, index, item) {
        const row = new Adw.ExpanderRow({
            title: item.title || _('Submenu'),
            use_markup: false,
            expanded: this._expanded.has(item),
        });
        row.add_prefix(new Gtk.Image({icon_name: 'folder-symbolic'}));
        row.add_suffix(this._buildControls(list, index));
        row.connect('notify::expanded', () => {
            if (row.expanded)
                this._expanded.add(item);
            else
                this._expanded.delete(item);
        });

        const titleEntry = new Adw.EntryRow({title: _('Submenu title'), text: item.title ?? ''});
        titleEntry.connect('changed', () => {
            item.title = titleEntry.text;
            row.title = titleEntry.text || _('Submenu');
            this._save();
        });
        row.add_row(titleEntry);

        this._buildRows(item.children, widget => row.add_row(widget), true);
        row.add_row(this._buildAddBar(item.children, false));
        return row;
    }

    /** Move up / move down / remove buttons for `list[index]`. */
    _buildControls(list, index) {
        const box = new Gtk.Box({spacing: 2, valign: Gtk.Align.CENTER});
        const addButton = (iconName, tooltip, sensitive, action) => {
            const button = new Gtk.Button({
                icon_name: iconName,
                tooltip_text: tooltip,
                sensitive,
                css_classes: ['flat'],
                valign: Gtk.Align.CENTER,
            });
            button.connect('clicked', () => {
                action();
                this._save();
                this._rebuild();
            });
            box.append(button);
        };

        addButton('go-up-symbolic', _('Move up'), index > 0, () => moveItem(list, index, -1));
        addButton('go-down-symbolic', _('Move down'), index < list.length - 1, () => moveItem(list, index, 1));
        addButton('user-trash-symbolic', _('Remove'), true, () => list.splice(index, 1));
        return box;
    }

    /** The "Add application / separator / submenu" buttons below a list. */
    _buildAddBar(list, allowSubmenu) {
        const bar = new Gtk.Box({
            spacing: 6,
            halign: Gtk.Align.START,
            margin_top: 6,
            margin_bottom: 6,
            margin_start: 12,
            margin_end: 12,
        });
        const addButton = (label, iconName, onClicked) => {
            const button = new Gtk.Button({
                css_classes: ['flat'],
                child: new Adw.ButtonContent({label, icon_name: iconName}),
            });
            button.connect('clicked', onClicked);
            bar.append(button);
        };
        const append = item => {
            list.push(item);
            this._save();
            this._rebuild();
        };

        addButton(_('Add application'), 'list-add-symbolic', () => {
            chooseApp(this.get_root(), id => append(createApp(id)));
        });
        addButton(_('Add separator'), 'list-add-symbolic', () => append(createSeparator()));
        if (allowSubmenu) {
            addButton(_('Add submenu'), 'folder-new-symbolic', () => {
                const submenu = createSubmenu(_('New submenu'));
                this._expanded.add(submenu);
                append(submenu);
            });
        }
        return bar;
    }
});
