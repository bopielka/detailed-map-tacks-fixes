# 09 — `ui/options/` and persistence

One file, `najane-map-tacks-options.js`, and one option.

## ⚠️ It loads in SHELL scope too

The options screen exists in the **main menu** as well as in game. That is why the `.modinfo`
registers this file in both an `ActionGroup` with `scope="game"` and one with `scope="shell"` —
registering it in one only makes the option disappear from the other.

The main menu has **no game, no engine events, no DOM to speak of, and no host mod**. So:

- The only imports of this mod's own code allowed here are near-leaves that do nothing at
  import time. Today that is `engine/fixes-setting.js`, which builds a closure and stops.
- ⚠️ **Nothing from `host/` or `patches/` may be imported here.** It would drag the host's
  absence into the main menu, where the host is always absent.

## The shared "Mods" tab

```js
CategoryType['Mods'] = 'mods';
CategoryData[CategoryType.Mods] ??= { … };
```

⚠️ The "Mods" category is **not part of the base game**. It is created with `??=` under the
shared id `mods`, so several community mods land in one tab instead of each spawning its own.
Najane's other two mods do exactly the same and share the tab by construction. Do not rename
the id.

Inside it, this mod has its own heading: the group `najane_map_tacks`.

⚠️ **Order matters** — a group is laid out in the order its options are added.

## The option

| Label | id | Type | Default |
|---|---|---|---|
| `LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED` | `najane-map-tacks-fixes-enabled` | Checkbox | on |

It is the master switch, backed by `areFixesEnabled()` / `setFixesEnabled()` in
`engine/fixes-setting.js`, and read once by `startPatches()`.

⚠️ **Changing it takes effect on the next load**, because `startPatches()` runs at script load
and scripts load once per session. `FixesSettingChangedEventName` is dispatched for anything
that wants to react live; nothing does yet. If a future fix can be undone cleanly, it should
listen — and if it cannot, the option's description must not imply otherwise.

## How the value is stored

Through `storedSwitch` — see [engine](06-engine.md) for the two traps it exists to solve
(the `0`-means-unset ambiguity, and the `saveCheckpoint()` that makes the value survive
quitting). The stored key is
`user / Mod / detailed-map-tacks-fixes-by-najane.fixesEnabled`.

⚠️ The key is namespaced with the mod id on purpose: these options share one flat namespace
with every other mod's.
