# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

An **add-on** for Sid Meier's Civilization VII that patches another mod: **Detailed Map Tacks**
by **wltk** (`detailed-map-tacks`, Workshop id 3507297712). Plain ES modules, **no build step,
no bundler, no TypeScript, no tests** — the game loads the `.js` files directly.

## The one fact that shapes everything here

**This mod is not stand-alone and must never become stand-alone.** It has no screen, no
features and no reason to exist without the host mod. Every design decision below follows
from that:

- The `.modinfo` declares `detailed-map-tacks` in **`<Dependencies>`**, not `<References>`.
  Dependencies is the hard form — the game refuses to apply this mod's components when the
  host is missing, so a player who has only this one gets nothing instead of a wall of errors.
- Load order is **2000**, above the host's default. A patch that runs before the thing it
  patches defines is a patch that silently does nothing.
- **Nothing outside `ui/host/` may name the host.** One file knows the host's module paths,
  component names and interface modes, so a host update breaks in one place.
- ⚠️ **Never `import` a host module statically.** A static import of a file that is not there
  fails at load time and takes *this whole mod* down with it, entry point included. Go through
  `loadHostModule()` in `ui/host/detailed-map-tacks.js`, which is dynamic and caught.

The host's source is readable on disk and is the reference, not a guess:
`~/Library/Application Support/Steam/steamapps/workshop/content/1295660/3507297712/`.

## Read this first

**[`documentation/README.md`](documentation/README.md) is the index, and it is written for
exactly this situation** — an agent starting with no context. Read the document covering the
area you are about to touch before you touch it.

Two sibling mods by the same author share this skeleton, these conventions and most of these
traps: `../better-commerce-screen-ui` and `../better-specialists-ui`. When something here is
thin, they are where the worked example is. `../knowledge-base/` is the Civ VII modding
reference behind all three.

## Commands

Everything goes through one script. **The game never reads this repository** — it reads a copy
in its own mod folder, so a change that has not been deployed is a change that is not running.

```bash
./deploy.sh
```

```bash
./deploy.sh --dry
```

```bash
CIV7_MODS_DIR="/path/to/Mods" ./deploy.sh
```

`deploy.sh` is the script on **both** platforms (it branches on `uname`). `deploy-on-mac.sh`
is a two-line shim kept because it is what gets typed. It wipes and rebuilds the target, copies
only `.modinfo` + `ui/` + `text/` (+ `config/` when there is one), parses every script, and
refuses to deploy if either BBCode file is over its character limit.

After deploying, **return to the main menu or restart** — scripts are loaded once.

### ⚠️ `node --check` is worthless on these files

It parses `.js` as CommonJS, meets `import`, gives up, and **exits 0 on a file with a syntax
error**. Every "syntax ok" reported that way means nothing. The real check reads from stdin:

```bash
for f in $(find ui -name '*.js'); do node --input-type=module --check < "$f" || echo "FAIL $f"; done
```

`deploy.sh` runs this itself, which is the reason to deploy rather than hand-check.

### Logs

macOS: `~/Library/Application Support/Civilization VII/Logs/`.
Windows: `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Logs\`.
`UI.log` (this mod's output and JS errors), `Modding.log` (was it loaded, and **was the host
loaded**), `Database.log` (did the XML validate).

⚠️ **`console.log` never reaches `UI.log`.** Use `log()` / `warn()` from
`ui/support/diagnostics.js`, which go through `console.error`. `log()` is gated on
`DIAGNOSTICS`, which ships `false`; `warn()` always writes. Anything a player might need to
report has to be a `warn`. Every line is tagged `[najane-map-tacks]` — the log carries the
host's lines too, and "the map tacks are wrong" is a report that could belong to either mod.

## Architecture

Four layers, and **the dependency direction is load-bearing, not tidiness**:

```
support  ←  engine  ←  host  ←  patches
```

Never import upwards. `support/` and `engine/` are ordinary Civ VII code that knows nothing
about the host and would survive it being replaced; `host/` is the single translation layer;
`patches/` is the only place that changes anything.
[`documentation/02-architecture.md`](documentation/02-architecture.md) has the rest.

⚠️ **`ui/options/` loads in SHELL scope too** — the options screen exists in the main menu,
where there is no game, no DOM, no engine events and no host mod. A module it imports may
reach no further than `ui/engine/changes-setting.js`, and must do nothing at import time beyond
declaring itself. Importing anything from `host/` or `patches/` there would drag the host's
absence into the main menu.

Two entry points, both listed in the `.modinfo`; everything else arrives by `import`, which is
also what fixes load order:

| File | Scope |
|---|---|
| `ui/detailed-map-tacks-tweaks.js` | game — calls `startPatches()` and nothing else |
| `ui/options/najane-map-tacks-options.js` | game **and** shell |

Three choke points worth knowing before writing anything new:

- **`ui/patches/patches.js`** — the one list of changes. The master switch and the host check
  are answered there, once, not inside each change. What this mod does to the host can be read
  off that one file, which is the question a bug report actually asks.
- **`ui/host/detailed-map-tacks.js`** — every path, component name and interface mode of the
  host, plus `loadHostModule()`.
- **`ui/engine/events.js`** — every `engine.on` in the mod. One engine subscription per event
  name however many listeners want it. Engine events are raised for **every player in the
  game**, so a handler must rule an event out cheaply and early; ⚠️ there is no owner filter
  here on purpose — the one subscriber checks the plot first, which is cheaper. Port
  `onLocalPlayerEvent` from `../better-commerce-screen-ui` if a change needs a real one.

## Rules that are easy to break

1. **Prefer `Controls.decorate` over anything else.** It is the seam the host leaves open:
   it needs no import, cannot fail at load time, and does not care whether this mod ran
   before or after the host — `decorate` creates the component entry if it is missing.
   `Controls.define` on a host component name is the opposite: it replaces the host's
   definition outright and fights every other mod doing the same.
2. **Do not fork the host.** Copying a host file in and editing it there means the change is
   frozen at today's host version and silently reverts a host update. Patch what is running.
3. **Keep the FACT in a `⚠️` comment, not the story.** Each one records a bug that shipped, a
   measurement, or an approach that failed — keep that, drop the narrative around it. If you
   change the code one describes, update it. See **Comments** below for the budget.
4. **No backtick inside a CSS template literal**, including in comments — it closes the
   string and the module fails to load, taking the whole mod with it. Use quotes in CSS
   comments. `deploy.sh` checks for this.
5. **The changelog is written twice, in the same pass.** `CHANGELOG.md` carries the cause and
   the reasoning; `STEAM_CHANGELOG.bbcode` carries one bullet per change and has a hard
   8000-character limit that `deploy.sh` enforces. When it is close, **drop the oldest version
   section** rather than trimming recent ones.
6. **A change needs the host's behaviour written down.** `CHANGELOG.md` says what was wrong in the host,
   not only what this mod now does — that is the note that says whether the patch can be
   dropped after a host update.
7. **`TODO.md` says: "For AI agents: Don't edit this file unless asked. Don't implement TODOs
   from here unless asked."** Honour it.
8. **Set `DIAGNOSTICS = false` before publishing.**

## Performance is a correctness requirement here

This is UI code inside the game's own single JavaScript thread. Work done badly here does not
show up as a slow function — it shows up as the whole game stuttering, and players report it
as "the game runs slowly with this mod on". **Every change gets a cost check before it is
finished**, and the answer goes in the `⚠️` comment beside it.

What to check, in the order these have actually bitten:

- **Is it on an engine event?** Events are raised for **every player**; `UnitMoved` and
  friends arrive in their thousands per AI turn. Subscribe through `ui/engine/events.js`, and
  make the first question the cheapest one that rules the event out.
- **Does it run per plot icon, per frame or per DOM mutation?** Map tacks are drawn per plot;
  the host already walks its whole tack list on several events. Anything added inside that
  walk is multiplied by the number of tacks the player has placed.
- **Is it a call into the game?** `GameInfo.*.lookup`, `Database.makeHash`, `Game.getHash`,
  `Locale.compose` and `UI.getOption` are lookups, not constants — memoise anything whose
  answer cannot change while the game runs.
- **Is a timeout counted in frames?** Make it wall-clock. A frame-based ceiling stretches
  exactly when the game is already slow, and does not fire at all when the frame loop is not
  running.

⚠️ **Measure rather than assume, and say what you measured.** `logEventStats()` (diagnostics
on) prints per-event counts and cost. A `⚠️` note carrying a real number is worth more than
one carrying an opinion.

⚠️ **Nothing here is kept "for later".** There is no `dom.js`, no `storedChoice`, no owner
filter and no unsubscribe path, because nothing calls them. Each of those exists in
`../better-commerce-screen-ui`, is named in `documentation/` where it would go, and is a copy
away when a change first needs it. Add the facility with the caller, not before it.

## Comments

The comments here are for an agent opening this repository cold, with no memory of the session
that wrote them — **that is the whole budget**. A comment earns its place by carrying something
the code cannot say: a constraint, a measurement, a platform trap, a fact about the host, or
the reason a layer boundary sits where it does.

- **Say the fact, not the history.** "⚠️ Never import a host module statically — a missing
  file takes this whole mod down at load time" — not three paragraphs on how that was found.
- **Never restate the code.** If the line says what it does, the comment above it is noise.
- A module header is **three to eight lines** for an ordinary module: what this is for, why it
  lives in this layer, and the one or two traps in it.
- Prefer one `⚠️` line over a `⚠️` paragraph. If it genuinely needs a paragraph, it probably
  belongs in `documentation/`, with the comment pointing at it.

⚠️ This is a rule about **density, not about deleting knowledge**. Compress a long note down to
the constraint it protects; do not throw the constraint away with the prose.

⚠️ **A comment inside a template literal is not a comment — it is DATA.** CSS in these mods
lives in template literals, so a `/* ... */` in a style constant is part of a string.

## Conventions

Follow the surrounding code; it is consistent with both sibling mods. 4-space indent,
semicolons, single quotes, trailing commas. `camelCase` functions, `SCREAMING_SNAKE` module
constants, `LOC_NAJANE_MAP_TACKS_*` / `LOC_OPTIONS_NAJANE_MAP_TACKS_*` localisation keys,
`najane-map-tacks-*` CSS classes and style ids. Imports of game files are absolute
(`/core/…`, `/base-standard/…`), of this mod's files relative, of the host's **never static**.

⚠️ Wrap every call into the game in `try`/`catch` and `warn` on failure. The engine throws
where a browser would return `undefined`. The same goes double for calls into the host, which
can change under you between one Workshop update and the next.

New localisation keys go into **all twelve** `text/<locale>/InGameText.xml` files.
⚠️ `text/ru_RU/` holds **Ukrainian**; see the note in the file.
