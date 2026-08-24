# Detailed Map Tacks Tweaks by Najane

An **add-on** for the Civilization VII mod **[Detailed Map Tacks](https://steamcommunity.com/sharedfiles/filedetails/?id=3507297712)**
by **wltk**. It changes two things about how map tacks behave. It is **not a replacement** for
that mod and does nothing on its own.

- **Requires:** Detailed Map Tacks. Declared as a hard dependency, so with the host missing or
  disabled this mod simply does not apply — no errors, no half-working screens.
- **UI only.** No rules, values or balance are changed. `AffectsSavedGames = 0`.
- **Safe to remove** at any time, mid-save included.

## What it changes

**A generic map tack disappears once something that fulfils it is built.** Detailed Map Tacks
clears a tack when the building it names is finished on that tile, but it compares the two type
names as text — so only a tack for one *specific* building ever matches. A "culture building",
"wonder" or "improvement" tack has no single name to match and stays on the map. This clears it
using the same list of buildings the tack's own tooltip already shows you, plus the game's type
tags for civ-unique buildings.

Walls and other slotless buildings do not clear a tack, and a unique-quarter tack waits for both
of its buildings: a plan is only cleared once it is genuinely finished.

**Right-click a map tack on the map to delete it.** On its own, Detailed Map Tacks deletes a
tack on left-click and only while the tack chooser is open — its source carries wltk's own
"TODO: Come up with a better quicker deletion solution." The click is swallowed, so deleting a
tack does not also send your selected unit walking to that tile.

⚠️ Neither of these is a bug report. Whether a generic tack should clear at all is a design
call, and the deletion shortcut is a note wltk already left. Both are optional and both can be
switched off — see below.

## For wltk

**If you want either change in Detailed Map Tacks itself, please take it.** The whole source is
in this repository, no attribution needed and no permission to ask for. I would rather this mod
became unnecessary than kept existing.

<https://github.com/bopielka/detailed-map-tacks-fixes>

## Options

Under **Options → Mods → Detailed Map Tacks** — the same heading the host mod's settings would
use, so there is one place to look:

| Option | Default | What it does |
|---|---|---|
| Apply Najane's changes | on | Turns everything this mod does off without uninstalling it. The first thing to try if map tacks start behaving oddly after a Detailed Map Tacks update. Takes effect on the next load. |
| Remove map tacks with right-click | on | Right-clicking a tack on the map deletes it. Takes effect at once. |

## Installing

Subscribe on the Steam Workshop, or copy the mod folder into:

- **macOS** — `~/Library/Application Support/Civilization VII/Mods/`
- **Windows** — `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Mods\`

Enable **both** this mod and Detailed Map Tacks in the Mods menu, then restart or return to the
main menu.

## Reporting a problem

Say which version of **both** mods you have, and attach `UI.log`. Lines from this mod are
tagged `[najane-map-tacks]`; lines from the host are not. If turning the first option off makes
the problem go away, that is the single most useful thing you can say.

## Building on it

`documentation/` is written for whoever works on the code next — start at
[`documentation/README.md`](documentation/README.md). `CLAUDE.md` is the same thing compressed
for an AI agent.

## Credits and licence

- **Detailed Map Tacks** is by **wltk**. This mod builds on it; it does not include, fork or
  redistribute it.
- Changes by **Najane**.
