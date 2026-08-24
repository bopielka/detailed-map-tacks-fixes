# Detailed Map Tacks Fixes by Najane

An **add-on** for the Civilization VII mod **[Detailed Map Tacks](https://steamcommunity.com/sharedfiles/filedetails/?id=3507297712)**
by **wltk**. It fixes bugs and rough edges in that mod. It is **not a replacement** for it and
does nothing on its own.

- **Requires:** Detailed Map Tacks. The mod declares it as a hard dependency, so with the host
  missing or disabled this mod simply does not apply — no errors, no half-working screens.
- **UI only.** No rules, values or balance are changed. `AffectsSavedGames = 0`.
- **Safe to remove** at any time, mid-save included.

## What it fixes

Nothing yet — this is the scaffolding for the fixes, not the fixes. Each one will be listed
here and in [`CHANGELOG.md`](CHANGELOG.md), which also records *what the host does wrong*, so
that a patch can be dropped again once wltk fixes it upstream.

## Options

Under **Options → Mods → Detailed Map Tacks Fixes by Najane**:

| Option | Default | What it does |
|---|---|---|
| Apply Detailed Map Tacks fixes | on | Turns every fix off without uninstalling the mod. The first thing to try if map tacks start misbehaving after a Detailed Map Tacks update. |

## Installing

Subscribe on the Steam Workshop, or copy the mod folder into:

- **macOS** — `~/Library/Application Support/Civilization VII/Mods/`
- **Windows** — `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Mods\`

Enable **both** this mod and Detailed Map Tacks in the Mods menu, then restart or return to the
main menu.

## Reporting a problem

Say which version of **both** mods you have, and attach `UI.log`. Lines from this mod are
tagged `[najane-map-tacks]`; lines from the host are not. If turning the option above off makes
the problem go away, that is the single most useful thing you can say.

## Building on it

`documentation/` is written for whoever works on the code next — start at
[`documentation/README.md`](documentation/README.md). `CLAUDE.md` is the same thing compressed
for an AI agent.

## Credits and licence

- **Detailed Map Tacks** is by **wltk**. This mod patches it; it does not include, fork or
  redistribute it.
- Fixes by **Najane**.
