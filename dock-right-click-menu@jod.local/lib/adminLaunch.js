// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {buildAdminArgv, stripFieldCodes, terminalPrefix} from './adminCommand.js';

const TERMINAL_SCHEMA = 'org.gnome.desktop.default-applications.terminal';

/** The user's default terminal as a command prefix, or [] when it is not configured. */
function defaultTerminal() {
    const schema = Gio.SettingsSchemaSource.get_default()?.lookup(TERMINAL_SCHEMA, true);
    if (!schema)
        return [];
    const settings = new Gio.Settings({settings_schema: schema});
    return terminalPrefix(settings.get_string('exec'), settings.get_string('exec-arg'));
}

/**
 * Run an app as administrator. The authentication prompt is shown by polkit
 * (graphical apps, Files) or by sudo inside a terminal; this code never sees a
 * password. The process is started without a shell, from an argument list.
 *
 * @param {Shell.App} app The app to run.
 * @throws {Error} When no suitable command exists or it cannot be started.
 */
export function launchAsAdmin(app) {
    const info = app.get_app_info();
    const commandline = info?.get_commandline();
    if (!commandline)
        throw new Error(`${app.get_name()} has no command line`);

    const [, parsed] = GLib.shell_parse_argv(commandline);
    const env = {};
    for (const name of ['WAYLAND_DISPLAY', 'DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR'])
        env[name] = GLib.getenv(name);

    const argv = buildAdminArgv({
        appId: app.get_id(),
        argv: stripFieldCodes(parsed),
        runsInTerminal: info.get_boolean('Terminal'),
        isTerminalEmulator: (info.get_categories() ?? '').split(';').includes('TerminalEmulator'),
        terminal: defaultTerminal(),
        env,
        hasAdminScheme: Gio.Vfs.get_default().get_supported_uri_schemes().includes('admin'),
    });
    if (!argv)
        throw new Error(`${app.get_name()} cannot be run as administrator`);

    Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
}
