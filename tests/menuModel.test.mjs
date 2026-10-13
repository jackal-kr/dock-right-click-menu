// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    createApp, createSeparator, createSubmenu, moveItem, parseItems, resolveItems,
    sanitizeItems, serializeItems,
} from '../dock-right-click-menu@jod.local/lib/menuModel.js';

const app = id => ({type: 'app', id});
const sep = () => ({type: 'separator'});
const sub = (title, children) => ({type: 'submenu', title, children});

describe('parseItems', () => {
    it('returns an empty list for invalid JSON or the wrong shape', () => {
        assert.deepEqual(parseItems(''), []);
        assert.deepEqual(parseItems('not json'), []);
        assert.deepEqual(parseItems('{"type":"app"}'), []);
        assert.deepEqual(parseItems('null'), []);
    });

    it('round-trips a valid menu', () => {
        const items = [app('a.desktop'), sep(), sub('Office', [app('b.desktop'), sep()])];
        assert.deepEqual(parseItems(serializeItems(items)), items);
    });
});

describe('sanitizeItems', () => {
    it('drops unknown types, bad entries and apps without an id', () => {
        const raw = [null, 3, 'x', [], {type: 'nope'}, {type: 'app'}, {type: 'app', id: ''}, {type: 'app', id: 7}, app('ok.desktop')];
        assert.deepEqual(sanitizeItems(raw), [app('ok.desktop')]);
    });

    it('does not allow a submenu inside a submenu', () => {
        const raw = [sub('Outer', [app('a.desktop'), sub('Inner', [app('b.desktop')])])];
        assert.deepEqual(sanitizeItems(raw), [sub('Outer', [app('a.desktop')])]);
    });

    it('defaults a missing submenu title and children', () => {
        assert.deepEqual(sanitizeItems([{type: 'submenu'}]), [sub('', [])]);
    });

    it('keeps admin only when it is exactly true', () => {
        const raw = [
            {type: 'app', id: 'a.desktop', admin: true},
            {type: 'app', id: 'b.desktop', admin: false},
            {type: 'app', id: 'c.desktop', admin: 'yes'},
            {type: 'app', id: 'd.desktop', admin: 1},
        ];
        assert.deepEqual(sanitizeItems(raw), [
            {type: 'app', id: 'a.desktop', admin: true}, app('b.desktop'), app('c.desktop'), app('d.desktop'),
        ]);
    });

    it('keeps admin inside submenus', () => {
        const raw = [sub('S', [{type: 'app', id: 'a.desktop', admin: true}])];
        assert.deepEqual(sanitizeItems(raw), raw);
    });

    it('strips unknown properties', () => {
        assert.deepEqual(sanitizeItems([{type: 'app', id: 'a.desktop', evil: true}]), [app('a.desktop')]);
    });
});

describe('resolveItems', () => {
    const installed = new Set(['a.desktop', 'b.desktop', 'c.desktop']);
    const lookup = id => (installed.has(id) ? {id} : null);

    it('drops apps that are not installed', () => {
        const out = resolveItems([app('a.desktop'), app('gone.desktop')], lookup);
        assert.deepEqual(out, [{type: 'app', app: {id: 'a.desktop'}, admin: false}]);
    });

    it('passes the admin flag through, also inside submenus', () => {
        const out = resolveItems([{type: 'app', id: 'a.desktop', admin: true}, sub('S', [{type: 'app', id: 'b.desktop', admin: true}, app('c.desktop')])], lookup);
        assert.equal(out[0].admin, true);
        assert.deepEqual(out[1].children.map(e => e.admin), [true, false]);
    });

    it('removes leading, trailing and repeated separators', () => {
        const out = resolveItems([sep(), app('a.desktop'), sep(), sep(), app('b.desktop'), sep()], lookup);
        assert.deepEqual(out.map(e => e.type), ['app', 'separator', 'app']);
    });

    it('cleans up separators left behind by dropped entries', () => {
        const out = resolveItems([app('a.desktop'), sep(), app('gone.desktop'), sep(), app('b.desktop')], lookup);
        assert.deepEqual(out.map(e => e.type), ['app', 'separator', 'app']);
    });

    it('drops submenus that end up empty', () => {
        const out = resolveItems([sub('Empty', []), sub('Gone', [app('gone.desktop'), sep()]), app('a.desktop')], lookup);
        assert.deepEqual(out.map(e => e.type), ['app']);
    });

    it('keeps the submenu title and resolves its children', () => {
        const out = resolveItems([sub('Tools', [app('a.desktop'), sep(), app('b.desktop')])], lookup);
        assert.equal(out.length, 1);
        assert.equal(out[0].title, 'Tools');
        assert.deepEqual(out[0].children.map(e => e.type), ['app', 'separator', 'app']);
    });

    it('returns an empty list for an empty menu', () => {
        assert.deepEqual(resolveItems([], lookup), []);
    });
});

describe('moveItem', () => {
    it('swaps neighbours in place', () => {
        const list = [app('a'), app('b'), app('c')];
        assert.equal(moveItem(list, 1, -1), true);
        assert.deepEqual(list.map(i => i.id), ['b', 'a', 'c']);
        assert.equal(moveItem(list, 1, 1), true);
        assert.deepEqual(list.map(i => i.id), ['b', 'c', 'a']);
    });

    it('refuses to move past either end', () => {
        const list = [app('a'), app('b')];
        assert.equal(moveItem(list, 0, -1), false);
        assert.equal(moveItem(list, 1, 1), false);
        assert.equal(moveItem(list, 5, -1), false);
        assert.deepEqual(list.map(i => i.id), ['a', 'b']);
    });
});

describe('factories', () => {
    it('create valid items', () => {
        assert.deepEqual(sanitizeItems([createApp('a.desktop'), createSeparator(), createSubmenu('S')]),
            [app('a.desktop'), sep(), sub('S', [])]);
    });
});
