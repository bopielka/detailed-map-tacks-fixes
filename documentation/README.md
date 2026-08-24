# Developer documentation — Detailed Map Tacks Tweaks by Najane

Written for an AI agent (or a human) starting a **new session** on this mod with no prior
context. Read this file, then the document covering the area you are about to touch. Between
them they describe what the mod does, how its code is organised, what it knows about the mod
it patches, and which of the platform's traps have already been paid for once.

The repository's own `README.md` is the *player-facing* document. This folder is the
*implementer-facing* one: how it is built, and what will break if you build it differently.

## The one-paragraph summary

An **add-on** for Sid Meier's Civilization VII that patches another mod: **Detailed Map Tacks**
by **wltk** (`detailed-map-tacks`). It has no screen and no features of its own — everything it
does is a change to the host, registered in `ui/patches/patches.js`. It declares the host as a
**hard dependency**, so it cannot run alone. UI only; `AffectsSavedGames = 0`.

## Read this first, in this order

| # | Document | What it answers |
|---|---|---|
| 01 | [What the mod does](01-what-the-mod-does.md) | Every change it ships, and which module implements it |
| 02 | [Architecture](02-architecture.md) | The four layers, the dependency rule, load order, lifecycles |
| 03 | [Platform notes](03-platform-notes.md) | `Controls`, decorators, DOM and engine quirks |
| 04 | [The host mod](04-the-host-mod.md) | What Detailed Map Tacks is, how it is built, where its seams are |

Then the module documents, which mirror the folders under `ui/`:

| # | Document | Folder |
|---|---|---|
| 05 | [support](05-support.md) | `ui/support/` — logging, the build stamp |
| 06 | [engine](06-engine.md) | `ui/engine/` — talking to the game, stored settings |
| 07 | [host](07-host.md) | `ui/host/` — the single translation layer to the host mod |
| 08 | [patches](08-patches.md) | `ui/patches/` — the changes, and how to add one |
| 09 | [options and persistence](09-options-and-persistence.md) | `ui/options/`, the master switch |
| 10 | [localisation](10-localisation.md) | `text/<locale>/` |
| 11 | [development workflow](11-development-workflow.md) | Deploying, checking, reading logs, conventions |

## Rules an agent working here must not break

1. **This mod is never stand-alone.** `detailed-map-tacks` lives in `<Dependencies>`, not
   `<References>`. See [Architecture](02-architecture.md).
2. **The dependency direction.** `support` ← `engine` ← `host` ← `patches`. Never import
   upwards, and never name the host outside `ui/host/`.
3. **Never `import` a host module statically.** A missing file kills this mod at load time.
   Use `loadHostModule()`. See [host](07-host.md).
4. **Prefer `Controls.decorate` to every other patching technique.** See
   [Platform notes](03-platform-notes.md).
5. **`deploy.sh` after every change** (`deploy-on-mac.sh` is a shim for it). The game never
   reads this repository. See [workflow](11-development-workflow.md).
6. **`console.log` never reaches the game's log.** Use the helpers in
   `ui/support/diagnostics.js`, which go through `console.error`.
7. **Keep the FACT in a `⚠️` comment, not the story around it.** See the comment budget in
   [workflow](11-development-workflow.md).

## Conventions in this documentation

- Paths are relative to the repository root: `ui/host/detailed-map-tacks.js`.
- **"The host"** always means the mod being patched, Detailed Map Tacks.
- **"The engine"** means the game's C++ side, reached through globals like `Game`, `Players`,
  `Cities`, `GameInfo`, `engine.on(...)`.
- Where a document says **⚠️**, it is repeating a hard-won fact from a source comment.
