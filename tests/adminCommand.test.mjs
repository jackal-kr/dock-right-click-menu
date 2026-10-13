// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    buildAdminArgv, stripFieldCodes, terminalPrefix,
} from '../dock-right-click-menu@jod.local/lib/adminCommand.js';

const env = {WAYLAND_DISPLAY: 'wayland-0', DISPLAY: ':0', XAUTHORITY: null, XDG_RUNTIME_DIR: '/run/user/1000'};
const base = {
    appId: 'gedit.desktop',
    argv: ['gedit'],
    runsInTerminal: false,
    isTerminalEmulator: false,
    terminal: ['gnome-terminal', '--'],
    env,
    hasAdminScheme: true,
};

describe('stripFieldCodes', () => {
    it('removes field codes and what only existed for them', () => {
        assert.deepEqual(stripFieldCodes(['app', '--new-window', '%U']), ['app', '--new-window']);
        assert.deepEqual(stripFieldCodes(['app', '--file=%f', '%i', '%c']), ['app']);
    });

    it('keeps literal percent signs and other arguments', () => {
        assert.deepEqual(stripFieldCodes(['app', '100%%', 'x%y']), ['app', '100%', 'x%y']);
    });
});

describe('terminalPrefix', () => {
    it('uses -- instead of the deprecated -x for gnome-terminal', () => {
        assert.deepEqual(terminalPrefix('gnome-terminal', '-x'), ['gnome-terminal', '--']);
        assert.deepEqual(terminalPrefix('gnome-terminal', ''), ['gnome-terminal', '--']);
    });

    it('keeps the configured option of other terminals', () => {
        assert.deepEqual(terminalPrefix('xterm', '-e'), ['xterm', '-e']);
        assert.deepEqual(terminalPrefix('xfce4-terminal', '-x'), ['xfce4-terminal', '-x']);
    });

    it('is empty when no terminal is configured', () => {
        assert.deepEqual(terminalPrefix('', '-x'), []);
    });
});

describe('buildAdminArgv', () => {
    it('runs a graphical app through pkexec with the display variables', () => {
        assert.deepEqual(buildAdminArgv(base), [
            'pkexec', 'env', 'WAYLAND_DISPLAY=wayland-0', 'DISPLAY=:0', 'XDG_RUNTIME_DIR=/run/user/1000', 'gedit',
        ]);
    });

    it('passes arguments as separate items, never through a shell', () => {
        const argv = buildAdminArgv({...base, argv: ['app', '--name', 'a b; rm -rf /']});
        assert.equal(argv.at(-1), 'a b; rm -rf /');
        assert.equal(argv.at(-3), 'app');
    });

    it('opens Files on admin:/// when the scheme exists', () => {
        const spec = {...base, appId: 'org.gnome.Nautilus.desktop', argv: ['nautilus', '--new-window']};
        assert.deepEqual(buildAdminArgv(spec), ['nautilus', 'admin:///']);
    });

    it('falls back to pkexec for Files without the admin scheme', () => {
        const spec = {...base, appId: 'org.gnome.Nautilus.desktop', argv: ['nautilus'], hasAdminScheme: false};
        assert.equal(buildAdminArgv(spec)[0], 'pkexec');
    });

    it('opens a terminal emulator on a root shell', () => {
        const spec = {...base, argv: ['gnome-terminal'], isTerminalEmulator: true};
        assert.deepEqual(buildAdminArgv(spec), ['gnome-terminal', '--', 'sudo', '-i']);
    });

    it('runs command-line apps with sudo in the default terminal', () => {
        const spec = {...base, argv: ['htop'], runsInTerminal: true};
        assert.deepEqual(buildAdminArgv(spec), ['gnome-terminal', '--', 'sudo', 'htop']);
    });

    it('gives up when a command-line app has no terminal to run in', () => {
        assert.equal(buildAdminArgv({...base, argv: ['htop'], runsInTerminal: true, terminal: []}), null);
    });

    it('gives up without a command line', () => {
        assert.equal(buildAdminArgv({...base, argv: []}), null);
    });
});
