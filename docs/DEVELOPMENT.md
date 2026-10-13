# Development guide

How to set up a machine so you can test, run and debug the extension. Written for Ubuntu 26.04
(GNOME Shell 50, Wayland); the same steps work on any GNOME 49+ distribution with the package
names adjusted.

## 0. Quick start (automatic)

```bash
git clone https://github.com/jackal-kr/dock-right-click-menu.git
cd dock-right-click-menu
./scripts/setup-dev.sh --run      # or: make setup, then make nested
```

The script (safe to re-run) asks for your password once and then:

1. installs the missing packages (list in 1.1, including `mutter-dev-bin`);
2. runs `npm install`;
3. removes a real zip install if one hides your edits, and links the working tree into
   `~/.local/share/gnome-shell/extensions/`;
4. adds the extension to `org.gnome.shell enabled-extensions` with `gsettings` (this is what lets
   the nested shell load it **without logging out**; `gnome-extensions enable` cannot do that
   because your running shell has not seen the folder yet);
5. runs the unit tests, ESLint and `make doctor`;
6. with `--run`, opens the **Mutter Development Kit** window with a GNOME desktop inside.

From VS Code: *Terminal ▸ Run Task… ▸ Setup dev environment*, then *Nested shell*.
Your real session will pick the extension up at its next login. Sections 1 and 2 below describe
the same steps manually.

## 1. One-time setup (manual)

### 1.1 System packages

```bash
sudo apt install git make zip gettext libglib2.0-bin nodejs npm \
                 gnome-shell mutter-dev-bin dbus-daemon
```

| Package | Needed for |
|---|---|
| `make`, `zip` | `make zip`, `make install` |
| `gettext` | `msgfmt` (compile translations), `xgettext`/`msgmerge` (`make pot`) |
| `libglib2.0-bin` | `glib-compile-schemas` |
| `nodejs`, `npm` | unit tests and ESLint |
| `gnome-shell` | `gnome-extensions`, and the shell the nested window runs |
| `mutter-dev-bin` | `/usr/libexec/mutter-devkit`, the window of the nested shell. Without it `make nested` starts a shell you cannot see |
| `dbus-daemon` | `dbus-run-session` |

### 1.2 Get the code and the JavaScript tooling

```bash
git clone https://github.com/jackal-kr/dock-right-click-menu.git
cd dock-right-click-menu
npm install            # ESLint and the GNOME Shell type definitions (IntelliSense)
```

### 1.3 VS Code (optional but set up)

```bash
code .
```

Accept the *recommended extensions* prompt. Tasks are under **Terminal ▸ Run Task…**. *Run Test Task* runs the unit tests and
**Ctrl+Shift+B** builds the zip.

### 1.4 Verify

```bash
make doctor
```

Every line must be `ok` (a `warn` for "not linked" is fine until step 2). The command lists the
exact `apt`/`npm` command for anything missing. VS Code task: **Check environment**.

## 2. Link the working tree into GNOME Shell (once)

```bash
make uninstall   # only if you previously ran `make install`; a real copy hides your edits
make link        # compiles schema + translations, symlinks the tree into
                 # ~/.local/share/gnome-shell/extensions/dock-right-click-menu@jod.local
```

The nested shell loads the extension straight away (see section 0 for how it is enabled). Your
*real* session only discovers new extension folders at start-up, so for it **log out and back in**
once (Wayland cannot restart the shell in place). Then enable it:

```bash
gnome-extensions enable dock-right-click-menu@jod.local
gnome-extensions info dock-right-click-menu@jod.local     # State: ACTIVE
```

You never need to log out again to test code: use the nested shell.

## 3. The everyday loop

| Step | Command / task | What it tells you |
|---|---|---|
| 1 | `make test` (task **Test**) | the data model in `lib/menuModel.js` works; runs in plain Node, ~1 s |
| 2 | `make lint` (task **Lint**) | style and review-guideline problems |
| 3 | `make nested` (task **Nested shell**) | a throw-away GNOME Shell in a *Mutter Development Kit* window that loads your current code |
| 4 | right-click empty space on the dock **inside that window** | the real behaviour |
| 5 | task **Shell log** (`journalctl -f -o cat /usr/bin/gnome-shell`) | errors from the extension; filter with `grep dock-right-click` |
| 6 | close the nested window | the shell ends; the next `make nested` picks up every change |

Why the nested shell: GNOME Shell caches extension modules until it restarts, so edits are
invisible in your real session until the next login. The nested shell is a fresh process each time.

Things to know:

- The nested shell shares your user settings (dconf) and `~/.local/share/gnome-shell/extensions`,
  so the linked extension is enabled there as in your normal session. Menu entries you configure
  in either place are the same.
- Preferences are a separate process: `gnome-extensions prefs dock-right-click-menu@jod.local`
  always runs the current code. Changes to the `items` setting apply immediately without restart.
- Changing `extension.js` or `lib/*.js`: close and restart the nested shell. Changing
  `prefs.js`/`preferences/*.js`: just reopen the preferences window.
- Changing the GSettings schema (`schemas/*.gschema.xml`): run `make build`, then restart the
  nested shell.
- The log will contain unrelated warnings from other extensions (GSConnect, Bluetooth battery,
  `Clutter-WARNING … StBin`); ignore anything that does not mention this extension.

## 4. Checking a change end to end

Before a commit:

```bash
make test lint
make zip                      # proves the schema and translations compile
```

Manual checklist in the nested shell:

1. Empty menu: right-click shows only *Configure menu…*, which opens the preferences.
2. Add an app, a separator and a submenu in the preferences; the menu updates on the next click.
3. Right-click an app icon, *Show Apps* and the trash: the dock's own menu still appears.
4. Launch an app from the menu with both *Open a new window* and *Focus the app* behaviours.
5. Change the dock position (Settings ▸ Ubuntu Desktop ▸ Dock ▸ Position): the menu opens on the
   correct side.
6. Run as administrator (test this in your **real session**, not the nested shell, which has its own
   polkit agent): switch the shield on (Menu page) for Terminal, Files and one other app, open the menu, hold Ctrl and check that the labels change to *(as admin)* and revert
   when Ctrl is released. Choose each entry with Ctrl held: a root terminal with a `sudo` prompt,
   Files on the administrator location, the other app after a polkit password dialog. Without Ctrl
   the same entries must start normally. Cancel the dialog: nothing runs, no error.
7. Disable and re-enable the extension (`gnome-extensions disable/enable …`): no errors in the
   log, and right-click still works exactly once (no duplicate handlers).

## 5. Troubleshooting the environment

| Symptom | Cause and fix |
|---|---|
| `make nested` prints `Failed to launch devkit … mutter-devkit (No such file or directory)` and no window opens | `sudo apt install mutter-dev-bin` |
| The nested shell opens but the dock has no menu | Is the extension linked and enabled? `make doctor`. A real install in the extensions folder hides the link: `make uninstall && make link` |
| `gnome-extensions enable` says the extension does not exist | The shell has not seen the folder yet: log out and in once, or run it inside the nested shell |
| `make zip` fails with `msgfmt: command not found` | `sudo apt install gettext` |
| `make lint` fails with `eslint: not found` | `npm install` |
| `make link` says "is a real install" | `make uninstall`, then `make link` |
| Edits to `lib/*.js` have no effect in the real session | Expected, the shell caches modules. Use the nested shell, or log out and in |
| A dialog/crash in the nested shell | It cannot affect your real session; close the window |

## 6. Continuous integration

`.github/workflows/ci.yml` runs `make test`, `make lint` and `make zip` on every push and pull
request, so a green check on GitHub means the project builds from a clean checkout. The workflow
does not start a GNOME Shell; the manual checklist above covers the shell-side behaviour.
