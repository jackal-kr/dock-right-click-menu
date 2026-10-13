// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {launchAsAdmin} from './adminLaunch.js';
import {LaunchMode} from './constants.js';
import {ItemType} from './menuModel.js';

/** Builds and shows the popup menu next to the dock. At most one is alive. */
export class DockMenu {
    /**
     * @param {object} params Callbacks.
     * @param {() => void} params.openPreferences Opens the extension preferences.
     */
    constructor({openPreferences}) {
        this._openPreferences = openPreferences;
        this._state = null;
        this._idleId = 0;
        this._adminItems = [];
        this._ctrlHeld = false;
        this._stageEventId = 0;
    }

    get isOpen() {
        return this._state !== null && this._state.menu.isOpen;
    }

    /**
     * Show the menu beside the dock.
     *
     * @param {Clutter.Actor} dock The dock's top-level actor.
     * @param {number} x Pointer x, stage coordinates.
     * @param {number} y Pointer y, stage coordinates.
     * @param {object[]} entries Resolved entries (see menuModel.resolveItems).
     * @param {object} options Display options.
     * @param {boolean} options.showConfigure Append the "Configure menu" entry.
     * @param {number} options.launchMode One of {@link LaunchMode}.
     */
    open(dock, x, y, entries, {showConfigure, launchMode}) {
        this.destroy();

        const {side, sx, sy} = this._placement(dock, x, y);

        // A 1x1 invisible actor on the dock's edge, at the pointer, anchors the menu.
        const source = new St.Widget({x: sx, y: sy, width: 1, height: 1, reactive: false, opacity: 0});
        Main.uiGroup.add_child(source);

        const menu = new PopupMenu.PopupMenu(source, 0.5, side);
        Main.uiGroup.add_child(menu.actor);
        const manager = new PopupMenu.PopupMenuManager(source);
        manager.addMenu(menu);

        this._render(menu, entries, launchMode);
        if (showConfigure) {
            if (entries.length > 0)
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const configure = new PopupMenu.PopupImageMenuItem(_('Configure menu…'), 'preferences-system-symbolic');
            configure.connect('activate', () => this._openPreferences());
            menu.addMenuItem(configure);
        }

        this._state = {menu, source, manager};
        if (this._adminItems.length > 0) {
            // Show "(as admin)" on the flagged items while Ctrl is held.
            const [, , modifiers] = global.get_pointer();
            this._setCtrlHeld((modifiers & Clutter.ModifierType.CONTROL_MASK) !== 0);
            this._stageEventId = global.stage.connect('captured-event', (_stage, event) => this._trackCtrl(event));
        }
        menu.connect('open-state-changed', (_menu, isOpen) => {
            // Tear down once the menu has closed (after its animation).
            if (isOpen || this._idleId)
                return;
            this._idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._idleId = 0;
                if (this._state?.menu === menu)
                    this.destroy();
                return GLib.SOURCE_REMOVE;
            });
        });
        menu.open(BoxPointer.PopupAnimation.FULL);
    }

    /** Close and free the menu, if any. Safe to call repeatedly. */
    destroy() {
        if (this._stageEventId) {
            global.stage.disconnect(this._stageEventId);
            this._stageEventId = 0;
        }
        this._adminItems = [];
        this._ctrlHeld = false;
        if (this._idleId) {
            GLib.Source.remove(this._idleId);
            this._idleId = 0;
        }
        const state = this._state;
        if (!state)
            return;
        this._state = null;
        state.manager.removeMenu(state.menu);
        state.menu.destroy();
        state.source.destroy();
    }

    /**
     * Pick the side of the dock the menu should appear on, and the anchor
     * point: the dock's edge facing the screen, at the pointer position.
     */
    _placement(dock, x, y) {
        const monitor = Main.layoutManager.findMonitorForActor(dock) ?? Main.layoutManager.primaryMonitor;
        const [dx, dy] = dock.get_transformed_position();
        const [dw, dh] = dock.get_transformed_size();

        if (dw < dh) {
            const atLeft = dx + dw / 2 < monitor.x + monitor.width / 2;
            return {side: atLeft ? St.Side.LEFT : St.Side.RIGHT, sx: atLeft ? dx + dw : dx, sy: y};
        }
        const atTop = dy + dh / 2 < monitor.y + monitor.height / 2;
        return {side: atTop ? St.Side.TOP : St.Side.BOTTOM, sx: x, sy: atTop ? dy + dh : dy};
    }

    /** Follow the Ctrl key while the menu is open. Never consumes the event. */
    _trackCtrl(event) {
        const type = event.type();
        if (type === Clutter.EventType.KEY_PRESS || type === Clutter.EventType.KEY_RELEASE) {
            const key = event.get_key_symbol();
            if (key === Clutter.KEY_Control_L || key === Clutter.KEY_Control_R)
                this._setCtrlHeld(type === Clutter.EventType.KEY_PRESS);
        }
        return Clutter.EVENT_PROPAGATE;
    }

    /** Add or remove the "(as admin)" suffix of the flagged items. */
    _setCtrlHeld(held) {
        this._ctrlHeld = held;
        for (const {item, name} of this._adminItems)
            item.label.text = held ? _('%s (as admin)').replace('%s', () => name) : name;
    }

    _render(menu, entries, launchMode) {
        for (const entry of entries) {
            if (entry.type === ItemType.SEPARATOR) {
                menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            } else if (entry.type === ItemType.APP) {
                const item = new PopupMenu.PopupImageMenuItem(entry.app.get_name(), entry.app.get_icon());
                const canRunAsAdmin = entry.admin;
                if (canRunAsAdmin)
                    this._adminItems.push({item, name: entry.app.get_name()});
                item.connect('activate', (_item, event) => {
                    const ctrl = this._ctrlHeld ||
                        ((event?.get_state?.() ?? 0) & Clutter.ModifierType.CONTROL_MASK) !== 0;
                    if (canRunAsAdmin && ctrl)
                        this._launchAsAdmin(entry.app);
                    else
                        this._launch(entry.app, launchMode);
                });
                menu.addMenuItem(item);
            } else if (entry.type === ItemType.SUBMENU) {
                const submenu = new PopupMenu.PopupSubMenuMenuItem(entry.title || _('Folder'));
                menu.addMenuItem(submenu);
                this._render(submenu.menu, entry.children, launchMode);
            }
        }
    }

    _launchAsAdmin(app) {
        try {
            launchAsAdmin(app);
        } catch (e) {
            Main.notifyError(_('Could not run as administrator'), e.message);
        }
    }

    _launch(app, launchMode) {
        if (launchMode === LaunchMode.NEW_WINDOW && app.can_open_new_window())
            app.open_new_window(-1);
        else
            app.activate();
    }
}
