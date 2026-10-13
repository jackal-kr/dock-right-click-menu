// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Clutter from 'gi://Clutter';

import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';

/**
 * Name of the top-level actor of Ubuntu Dock / Dash to Dock
 * (`DashToDock` in Ubuntu 26.04).
 */
const DOCK_ACTOR_NAME = 'dashtodockContainer';

/** Style classes of the dock's icon slots (apps, "Show Apps", trash, ...). */
const ICON_STYLE_CLASSES = ['dash-item-container', 'app-well-app', 'show-apps'];

/**
 * Detects a secondary-button click on the empty part of the dock.
 *
 * Works on the stage's captured events, so it does not depend on the dock's
 * internals beyond the actor name above. The press is swallowed and the
 * callback fires on release, which is how GNOME's own click actions behave.
 */
export class DockClickWatcher {
    /**
     * @param {object} params Callbacks.
     * @param {(dock: Clutter.Actor, x: number, y: number) => void} params.onSecondaryClick
     *     Called on a right-click on empty dock space.
     * @param {() => boolean} [params.isSuppressed] Return true to ignore clicks,
     *     e.g. while our menu is open.
     */
    constructor({onSecondaryClick, isSuppressed = () => false}) {
        this._onSecondaryClick = onSecondaryClick;
        this._isSuppressed = isSuppressed;
        this._capturedId = 0;
        this._pending = false;
    }

    enable() {
        if (this._capturedId)
            return;
        this._capturedId = global.stage.connect('captured-event',
            (_stage, event) => this._onCapturedEvent(event));
    }

    destroy() {
        if (this._capturedId) {
            global.stage.disconnect(this._capturedId);
            this._capturedId = 0;
        }
        this._pending = false;
    }

    _onCapturedEvent(event) {
        const type = event.type();
        if (type !== Clutter.EventType.BUTTON_PRESS && type !== Clutter.EventType.BUTTON_RELEASE)
            return Clutter.EVENT_PROPAGATE;
        if (event.get_button() !== Clutter.BUTTON_SECONDARY || this._isSuppressed())
            return Clutter.EVENT_PROPAGATE;

        const actor = this._actorAt(event);
        const dock = this._findDock(actor);
        const onEmptySpace = dock !== null && !this._isOverIcon(actor, dock);

        if (type === Clutter.EventType.BUTTON_PRESS) {
            this._pending = onEmptySpace;
            return onEmptySpace ? Clutter.EVENT_STOP : Clutter.EVENT_PROPAGATE;
        }

        if (!this._pending)
            return Clutter.EVENT_PROPAGATE;
        this._pending = false;
        if (onEmptySpace) {
            const [x, y] = event.get_coords();
            this._onSecondaryClick(dock, x, y);
        }
        return Clutter.EVENT_STOP;
    }

    /**
     * The actor under the pointer. `event.get_source()` is null for captured
     * stage events on GNOME 50, so ask the stage instead.
     */
    _actorAt(event) {
        const [x, y] = event.get_coords();
        return global.stage.get_event_actor?.(event) ??
            global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
    }

    /** @returns {?Clutter.Actor} The dock containing `actor`, if any. */
    _findDock(actor) {
        for (let a = actor; a; a = a.get_parent()) {
            if (a.name === DOCK_ACTOR_NAME)
                return a;
        }
        return null;
    }

    /** True when `actor` is (inside) an icon slot, so the dock's own menu applies. */
    _isOverIcon(actor, dock) {
        for (let a = actor; a && a !== dock; a = a.get_parent()) {
            // The separator sits in an icon container but is not an icon.
            if (a.has_style_class_name?.('dash-separator'))
                return false;
            if (a instanceof AppDisplay.AppIcon)
                return true;
            if (ICON_STYLE_CLASSES.some(c => a.has_style_class_name?.(c)))
                return true;
        }
        return false;
    }
}
