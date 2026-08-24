# Detailed Map Tacks Fixes by Najane

An **add-on** for the Civilization VII mod **[Detailed Map Tacks](https://steamcommunity.com/sharedfiles/filedetails/?id=3507297712)**
by **wltk**. It fixes bugs and rough edges in that mod. It is **not a replacement** for it and
does nothing on its own.

- **Requires:** Detailed Map Tacks. The mod declares it as a hard dependency, so with the host
  missing or disabled this mod simply does not apply — no errors, no half-working screens.
- **UI only.** No rules, values or balance are changed. `AffectsSavedGames = 0`.
- **Safe to remove** at any time, mid-save included.

## What it fixes

**Generic map tacks are cleared when what they stand for gets built.** Detailed Map Tacks
removes a pin once the building it names is finished on that plot — but it compares the two
type names as text, so it only ever matched a pin for one *specific* building. A "culture
building", "wonder" or "improvement" pin could never match anything and stayed on the map for
the rest of the game. It now disappears as soon as a building that fulfils it goes up, using
the same list of buildings the pin's own tooltip already shows you, plus the game's type tags
for civ-unique buildings.

Walls and other slotless buildings do not clear a pin, and a unique-quarter pin waits for both
of its buildings: a plan is only cleared once it is genuinely finished.

**Right-click a map tack on the map to delete it.** Detailed Map Tacks on its own only deletes a
tack on left-click, and only while the tack chooser is open — its source carries wltk's own
"TODO: Come up with a better quicker deletion solution." The click is swallowed, so deleting a
tack does not also send your selected unit walking to that tile.

Each fix is listed here and in [`CHANGELOG.md`](CHANGELOG.md), which also records *what the
host does wrong*, so that a patch can be dropped again once wltk fixes it upstream.

## Options

Under **Options → Mods → Detailed Map Tacks** — the same heading the host mod's settings would use, so there is one place to look:

| Option | Default | What it does |
|---|---|---|
| Apply Najane's fixes | on | Turns every fix off without uninstalling the mod. The first thing to try if map tacks start misbehaving after a Detailed Map Tacks update. Takes effect on the next load. |
| Remove map tacks with right-click | on | Right-clicking a tack on the map deletes it. Takes effect at once. |

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
