// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

/**
 * Builds the command line used to run an app as administrator. Pure functions,
 * no `gi://` imports, unit tested (tests/adminCommand.test.mjs). The shell side
 * that gathers the inputs and spawns the process is lib/adminLaunch.js.
 *
 * The password is never handled here: `pkexec` shows polkit's own dialog and
 * `sudo` runs inside a terminal that asks for it.
 */

/** Desktop file ids of file managers that can open `admin:///` (polkit, no root GUI process). */
const FILES_APP_IDS = new Set(['org.gnome.Nautilus.desktop']);

/** Environment variables a root GUI app needs to reach the user's display. */
const DISPLAY_VARIABLES = ['WAYLAND_DISPLAY', 'DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR'];

const FIELD_CODE = /%[fFuUdDnNickvm]/g;

/**
 * Remove the desktop-entry field codes (%U, %f, %i, ...) from an Exec line that
 * was split into arguments. `%%` is a literal percent sign.
 *
 * @param {string[]} argv Arguments of the Exec line.
 * @returns {string[]} Arguments without field codes and without empty leftovers.
 */
export function stripFieldCodes(argv) {
    const out = [];
    for (const arg of argv) {
        const stripped = arg.replaceAll('%%', '\u0000').replace(FIELD_CODE, '').replaceAll('\u0000', '%');
        // Drop what only existed for a field code: '' and a dangling '--option='.
        if (stripped === '' || (stripped !== arg && stripped.endsWith('=')))
            continue;
        out.push(stripped);
    }
    return out;
}

/**
 * The command prefix that runs a command inside the user's default terminal,
 * from GNOME's `default-applications.terminal` setting.
 *
 * @param {string} exec Terminal program, e.g. 'gnome-terminal'. May be empty.
 * @param {string} execArg Option that precedes the command, e.g. '-x'. May be empty.
 * @returns {string[]} For example ['gnome-terminal', '--']; empty when unknown.
 */
export function terminalPrefix(exec, execArg) {
    if (!exec)
        return [];
    // The setting still says '-x' for gnome-terminal, but that option is deprecated there.
    if (!execArg || (exec === 'gnome-terminal' && execArg === '-x'))
        return [exec, '--'];
    return [exec, execArg];
}

/**
 * @param {object} spec Everything needed to decide, gathered by the caller.
 * @param {string} spec.appId Desktop file id.
 * @param {string[]} spec.argv The app's Exec line without field codes.
 * @param {boolean} spec.runsInTerminal The desktop entry has Terminal=true.
 * @param {boolean} spec.isTerminalEmulator The app is a terminal emulator itself.
 * @param {string[]} spec.terminal See {@link terminalPrefix}.
 * @param {Record<string, ?string>} spec.env Session environment (see DISPLAY_VARIABLES).
 * @param {boolean} spec.hasAdminScheme The `admin://` location scheme is available.
 * @returns {?string[]} The command, or null when it cannot be built.
 */
export function buildAdminArgv({appId, argv, runsInTerminal, isTerminalEmulator, terminal, env, hasAdminScheme}) {
    if (argv.length === 0)
        return null;

    // Files: open the root of the file system with administrator rights, as the
    // "Other Locations ▸ Administrator" entry does. Nautilus itself stays a normal process.
    if (FILES_APP_IDS.has(appId) && hasAdminScheme)
        return [argv[0], 'admin:///'];

    // A terminal emulator: open it on a root shell. sudo asks for the password in the terminal.
    if (isTerminalEmulator)
        return [argv[0], '--', 'sudo', '-i'];

    // A command-line app: run it with sudo in the default terminal.
    if (runsInTerminal)
        return terminal.length > 0 ? [...terminal, 'sudo', ...argv] : null;

    // Any other graphical app: root through polkit, with the display variables kept.
    const variables = DISPLAY_VARIABLES.filter(name => env[name]).map(name => `${name}=${env[name]}`);
    return ['pkexec', 'env', ...variables, ...argv];
}
