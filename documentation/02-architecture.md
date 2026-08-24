# 02 — Architecture

## Four layers

```
support  ←  engine  ←  host  ←  patches
```

An arrow means "may import from". Nothing imports upwards.

| Layer | Folder | Knows about |
|---|---|---|
| support | `ui/support/` | Nothing. No game, no host, no other module of this mod except its own layer. |
| engine | `ui/engine/` | The game — `engine.on`, `UI.getOption`, `GameContext`. Not the host. |
| host | `ui/host/` | Detailed Map Tacks: its module paths, component names, interface modes, lens. |
| patches | `ui/patches/` | Everything above, and the actual bugs. |

`ui/options/` sits outside the stack on purpose — see the shell-scope rule below.

### Why the direction is load-bearing rather than tidy

**`support/` and `engine/` must survive the host.** If wltk renames the mod, rewrites it, or a
different map tack mod becomes the one worth patching, everything below `host/` is still
ordinary Civ VII code. The whole cost of that change is one file. A `warn` helper that knew a
host component name would spread that knowledge into every module that logs.

**`host/` must be the only file naming the host**, for the same reason in the other direction:
a Workshop update to Detailed Map Tacks is not an event you get told about. It shows up as a
fix that stopped working. Having one file to re-check against the host's source is the
difference between a ten-minute update and an audit.

## Loading

Two entry points, both in the `.modinfo`. Everything else arrives by `import`, which is also
what fixes the order — a module always runs before the module importing it.

| File | Scope | Does |
|---|---|---|
| `ui/detailed-map-tacks-fixes.js` | game | `startPatches()`, the diagnostics hook, the build stamp line |
| `ui/options/najane-map-tacks-options.js` | game **and** shell | Registers the option |

### ⚠️ `ui/options/` loads in SHELL scope

The options screen exists in the main menu, where there is **no game, no DOM, no engine events
and no host mod**. A module the options file imports may therefore reach no further than
`ui/engine/fixes-setting.js`, and must do nothing at import time beyond declaring itself.
`storedSwitch` builds a closure and stops; the stored value is read lazily, on the first
question asked.

Importing anything from `host/` or `patches/` into the options file would drag the host's
absence into the main menu — where the host is *always* absent.

### ⚠️ LoadOrder 2000

The host declares no `<LoadOrder>` at all, so it sits at the default. This mod is at **2000**,
which puts it after. A patch registered before the host defines the thing it patches does
nothing, and does it silently.

`Controls.decorate` happens to be order-independent (see [Platform notes](03-platform-notes.md)),
but nothing else is — so load last and stop having to think about it.

## ⚠️ The hard dependency

```xml
<Dependencies>
    <Mod id="base-standard" title="LOC_MODULE_BASE_STANDARD_NAME" />
    <Mod id="detailed-map-tacks" title="LOC_MOD_DETAILED_MAP_TACKS_NAME" />
</Dependencies>
```

`<Dependencies>` is the **hard** form: the game refuses to apply this mod's components when the
host is missing, so a player who installs only this one gets nothing rather than a wall of
errors in a log they will never read.

`<References>` is the soft form — it influences load order and compatibility but does **not**
require the mod to be present. `bz-map-trix` uses `<References>` to name five UI mods it
merely coexists with. That is the wrong tool here. **Do not move the host down to
`<References>`**; it would let this mod load alone.

Belt and braces on top of that: `isHostModPresent()` in `ui/host/detailed-map-tacks.js`, asked
once by `startPatches()`. Reaching a false there means something stranger than a missing
subscription — the host failed to load — and that is worth a `warn`, because it is the entire
explanation for "the fixes mod does nothing".

## The patch lifecycle

1. The game loads `ui/detailed-map-tacks-fixes.js` (once per session).
2. It calls `startPatches()`.
3. `startPatches()` asks, in order: is the host here, is the master switch on, is there
   anything registered. Each answer is asked **once, centrally** — a fix that has to remember
   to ask is a fix that will forget.
4. Each fix's `start()` runs inside its own `try`/`catch`. One broken fix must not take the
   rest of the pack with it.

⚠️ Registration runs at **script load**. `Controls.decorate` is safe there whatever the load
order; anything that reads the game is not — there may be no game yet. A fix needing one waits
for its own engine event or component lifecycle callback.
