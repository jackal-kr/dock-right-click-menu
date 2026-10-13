// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

/**
 * Pure data model of the menu, shared by the shell side and the preferences.
 *
 * The menu is stored in GSettings as a JSON string holding a list of items:
 *
 *   {type: 'app',       id: 'org.gnome.Nautilus.desktop', admin: true}
 *   {type: 'separator'}
 *   {type: 'submenu',   title: 'Office', children: [<app | separator>, ...]}
 *
 * `admin: true` (optional, only ever `true`) lets the app be run as administrator
 * from the menu by holding Ctrl. Submenus may only be nested one level deep. This module has no `gi://`
 * imports on purpose, so it can be unit tested with plain Node.js
 * (see tests/menuModel.test.mjs).
 */

export const ItemType = Object.freeze({
    APP: 'app',
    SEPARATOR: 'separator',
    SUBMENU: 'submenu',
});

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validate untrusted data and return a clean copy.
 * Unknown or malformed entries are dropped; submenus nested inside a
 * submenu are dropped.
 *
 * @param {unknown} raw Parsed JSON.
 * @param {boolean} [nested] True while sanitising the children of a submenu.
 * @returns {object[]} Valid items.
 */
export function sanitizeItems(raw, nested = false) {
    if (!Array.isArray(raw))
        return [];

    const out = [];
    for (const item of raw) {
        if (!isObject(item))
            continue;

        switch (item.type) {
        case ItemType.APP:
            if (typeof item.id === 'string' && item.id !== '') {
                const app = {type: ItemType.APP, id: item.id};
                if (item.admin === true)
                    app.admin = true;
                out.push(app);
            }
            break;
        case ItemType.SEPARATOR:
            out.push({type: ItemType.SEPARATOR});
            break;
        case ItemType.SUBMENU:
            if (!nested) {
                out.push({
                    type: ItemType.SUBMENU,
                    title: typeof item.title === 'string' ? item.title : '',
                    children: sanitizeItems(item.children, true),
                });
            }
            break;
        }
    }
    return out;
}

/**
 * Parse the value of the `items` setting. Never throws.
 *
 * @param {string} json Setting value.
 * @returns {object[]} Valid items, or an empty list for invalid input.
 */
export function parseItems(json) {
    try {
        return sanitizeItems(JSON.parse(json));
    } catch {
        return [];
    }
}

/**
 * @param {object[]} items Items to store.
 * @returns {string} Value for the `items` setting.
 */
export function serializeItems(items) {
    return JSON.stringify(items);
}

export const createApp = id => ({type: ItemType.APP, id});
export const createSeparator = () => ({type: ItemType.SEPARATOR});
export const createSubmenu = title => ({type: ItemType.SUBMENU, title, children: []});

/**
 * Move `list[index]` by `delta` positions, in place.
 *
 * @param {object[]} list List to modify.
 * @param {number} index Current position.
 * @param {number} delta -1 moves up, +1 moves down.
 * @returns {boolean} False when the move would leave the list.
 */
export function moveItem(list, index, delta) {
    const target = index + delta;
    if (index < 0 || index >= list.length || target < 0 || target >= list.length)
        return false;
    [list[index], list[target]] = [list[target], list[index]];
    return true;
}

/**
 * Turn stored items into what should actually be displayed: apps that are no
 * longer installed and empty submenus are dropped, and leading, trailing and
 * repeated separators are removed.
 *
 * @param {object[]} items Sanitised items (see {@link sanitizeItems}).
 * @param {(id: string) => ?object} lookupApp Returns the app for a desktop
 *     file id, or a falsy value when it is not installed.
 * @param {boolean} [nested] True while resolving the children of a submenu.
 * @returns {object[]} Entries: {type:'app', app, admin} | {type:'separator'} |
 *     {type:'submenu', title, children}.
 */
export function resolveItems(items, lookupApp, nested = false) {
    const out = [];
    for (const item of items) {
        if (item.type === ItemType.SEPARATOR) {
            if (out.length > 0 && out.at(-1).type !== ItemType.SEPARATOR)
                out.push({type: ItemType.SEPARATOR});
        } else if (item.type === ItemType.APP) {
            const app = lookupApp(item.id);
            if (app)
                out.push({type: ItemType.APP, app, admin: item.admin === true});
        } else if (item.type === ItemType.SUBMENU && !nested) {
            const children = resolveItems(item.children ?? [], lookupApp, true);
            if (children.length > 0)
                out.push({type: ItemType.SUBMENU, title: item.title, children});
        }
    }
    while (out.at(-1)?.type === ItemType.SEPARATOR)
        out.pop();
    return out;
}
