# Changelog

All notable changes to **Detailed Map Tacks Fixes by Najane**.

⚠️ Every entry that fixes something in the host mod says **what the host does wrong**, not only
what this mod now does. That is the note that decides, after a Detailed Map Tacks update,
whether the patch can be dropped or has to be re-checked.

⚠️ Written twice, in the same pass: this file carries the cause and the reasoning,
`STEAM_CHANGELOG.bbcode` carries one bullet per change for the Workshop change-note box.

## 0.1 — in progress

Scaffolding only; no fixes yet.

- **New mod.** An add-on to Detailed Map Tacks by wltk, structured as `support → engine →
  host → patches`. `ui/host/detailed-map-tacks.js` is the single file that names the host, so
  a host update breaks in one place rather than in every fix.
- **Hard dependency on the host.** `detailed-map-tacks` is declared in `<Dependencies>`, not
  `<References>`: the game will not apply this mod's components without it, so a player who
  installs only this one gets nothing rather than a wall of errors.
- **Load order 2000**, above the host's default. A patch registered before the host defines
  the thing it patches does nothing, silently.
- **Master switch** under Options → Mods, on by default. A fixes pack can turn into the bug
  the moment the host updates; this lets a player rule the mod out of a problem without
  unsubscribing from it.
- Twelve locales, matching the sibling mods. `text/ru_RU/` holds Ukrainian — see the note in
  the file.
