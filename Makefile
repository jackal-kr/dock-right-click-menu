# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 JOD (Oleksiy Degtyar)

UUID        := dock-right-click-menu@jod.local
DOMAIN      := dock-right-click-menu
EXT_DIR     := $(UUID)
VERSION     := $(shell sed -n 's/.*"version-name": *"\([^"]*\)".*/\1/p' $(EXT_DIR)/metadata.json)
ZIP         := dist/$(UUID).v$(VERSION).zip

POT         := po/$(DOMAIN).pot
PO_FILES    := $(wildcard po/*.po)
MO_FILES    := $(patsubst po/%.po,$(EXT_DIR)/locale/%/LC_MESSAGES/$(DOMAIN).mo,$(PO_FILES))
JS_FILES    := $(wildcard $(EXT_DIR)/*.js $(EXT_DIR)/lib/*.js $(EXT_DIR)/preferences/*.js)
SCHEMA_DIR  := $(EXT_DIR)/schemas
INSTALL_DIR := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: help setup doctor build pot test lint zip install link unlink uninstall nested clean

help:
	@echo "make setup      one-shot: install packages, npm tooling, link + enable the extension (Ubuntu)"
	@echo "make doctor     check that this machine can build, test and run the extension"
	@echo "make build      compile the GSettings schema and the translations"
	@echo "make test       run the unit tests (needs Node.js)"
	@echo "make lint       run ESLint (needs 'npm install' once)"
	@echo "make pot        regenerate $(POT) and update the .po files (needs gettext)"
	@echo "make zip        build $(ZIP)"
	@echo "make install    install the zip for the current user (log out and in once on Wayland)"
	@echo "make link       symlink the working tree into GNOME Shell (edit, then restart the shell or use make nested)"
	@echo "make unlink     remove that symlink"
	@echo "make uninstall  remove the installed extension or the dev link (never deletes your sources)"
	@echo "make nested     try the installed extension in a nested GNOME Shell window"
	@echo "make clean      remove build output"

setup:
	@./scripts/setup-dev.sh

doctor:
	@./scripts/check-env.sh

build: $(SCHEMA_DIR)/gschemas.compiled $(MO_FILES)

$(SCHEMA_DIR)/gschemas.compiled: $(wildcard $(SCHEMA_DIR)/*.gschema.xml)
	glib-compile-schemas --strict $(SCHEMA_DIR)

$(EXT_DIR)/locale/%/LC_MESSAGES/$(DOMAIN).mo: po/%.po
	mkdir -p $(dir $@)
	msgfmt --check --output-file=$@ $<

pot:
	xgettext --from-code=UTF-8 --language=JavaScript --keyword=_ --add-comments \
		--package-name=$(DOMAIN) --package-version=$(VERSION) \
		--copyright-holder="JOD (Oleksiy Degtyar)" \
		--output=$(POT) $(JS_FILES)
	for po in $(PO_FILES); do msgmerge --update --no-fuzzy-matching --backup=none $$po $(POT); done

test:
	node --test tests/*.test.mjs

lint:
	npx eslint .

zip: build
	mkdir -p dist
	rm -f $(ZIP)
	# gschemas.compiled is not shipped: GNOME Shell 45+ compiles the schema on install (EGO-P-006).
	cd $(EXT_DIR) && zip -qr ../$(ZIP) . -x 'schemas/gschemas.compiled'
	@echo "Built $(ZIP)"

install: zip
	gnome-extensions install --force $(ZIP)
	@echo "Installed. On Wayland, log out and in once, then: gnome-extensions enable $(UUID)"

link: build
	@if [ -e $(INSTALL_DIR) ] && [ ! -L $(INSTALL_DIR) ]; then \
		echo "$(INSTALL_DIR) is a real install; run 'make uninstall' first"; exit 1; fi
	mkdir -p $(dir $(INSTALL_DIR))
	ln -sfn $(CURDIR)/$(EXT_DIR) $(INSTALL_DIR)
	@echo "Linked $(INSTALL_DIR) -> $(CURDIR)/$(EXT_DIR)"

unlink:
	@if [ -L $(INSTALL_DIR) ]; then rm $(INSTALL_DIR) && echo "Removed link"; else echo "Not a link, nothing to do"; fi

uninstall:
	@if [ -L $(INSTALL_DIR) ]; then \
		rm $(INSTALL_DIR) && echo "Removed the link; your sources are untouched"; \
	elif [ -e $(INSTALL_DIR) ]; then \
		gnome-extensions uninstall $(UUID); \
	else echo "Not installed, nothing to do"; fi

nested:
	dbus-run-session -- gnome-shell --devkit --wayland

clean:
	rm -rf dist $(EXT_DIR)/locale $(SCHEMA_DIR)/gschemas.compiled
