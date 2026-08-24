# 07 — `ui/host/`

Two files. `detailed-map-tacks.js` is the **only** place in this mod that names the host;
`generic-tacks.js` is the single answer to "what does a generic tack stand for".

What is in it, and why the whole layer exists, is in [04 — The host mod](04-the-host-mod.md);
this document is about using it.

## What it exports

| Export | For |
|---|---|
| `HOST_MOD_ID` | `'detailed-map-tacks'` |
| `HOST_MODULES` (module-local) | Path per host module: `store`, `utils`, `generics`, `changeProcessor` |
| `HOST_COMPONENTS` | `icons` — `dmt-map-tack-icons`, the component this mod decorates |
| `isHostModPresent()` | Is the host actually running |
| `loadHostModule(key)` | A host module, or `null`, asynchronously |

## ⚠️ Never `import` a host module statically

A static import of a file that is not there — the player disabled the host, or wltk renamed it
— **fails at load time and takes this whole mod down with it, entry point included**. There is
no `try` around a static import; the module never runs.

```js
// NEVER
import MapTackStore from '/detailed-map-tacks/ui/map-tack-core/dmt-map-tack-store.js';

// The only safe form
const module = await loadHostModule('store');
if (!module) { return; }          // the host is gone; say nothing more and do nothing
const store = module.default;
```

`loadHostModule` is dynamic and caught, and caches the result **including the failure** — a
module that is not there will not be there on the next try either.

⚠️ Async, and that is not incidental: this is the only safe way to touch host code, so **a
patch that needs the store is an async patch**. Do not fight that by hoisting the import; the
whole guarantee lives in it being dynamic.

## ⚠️ Spelling is identity

Module identity in this engine is the **resolved URL**. The exact path in `HOST_MODULES` gives
back the module the host itself loaded — the same singleton — so wrapping one of its methods
patches the running host. A *different spelling of the same file* is a second module with a
second singleton, and a patch applied to it does nothing at all, silently.

That is why every path lives in this one map. **Add a key here rather than writing a path into
a patch.** ⚠️ Only the four modules something actually loads are listed; the host has more
(validator, yield, ui-utils, constants, icons-manager) and they are mapped in
[04 — The host mod](04-the-host-mod.md). Add one here when a change reaches for it, not before.

## `isHostModPresent()`

Two answers, cheapest first:

1. `Controls.isDefined(...)` on the host's components — a map lookup.
2. `Modding.getInstalledMods()` — slower, but does not depend on load order, so it still
   answers if the host's scripts have not run yet.

Asked **at most once**: it is called from patch registration at script load, and the answer
cannot change afterwards, because scripts are loaded once per session.

⚠️ A false here should be impossible — the `.modinfo` `<Dependencies>` entry stops this mod
applying without the host. Reaching it means the host failed to load, and that is the entire
explanation for "the changes mod does nothing", so `startPatches()` says so with `warn` rather
than `log`.

## `generic-tacks.js`

The host's generic tacks are **pseudo-types**: `DMT_BUILDING_CULTURE` and friends are not in
`GameInfo.Constructibles`, so every table keyed by `ConstructibleType` misses them. That one
fact is behind three of this mod's four changes — the host cannot clear a tack it cannot name,
cannot check terrain for a type with no rows, and cannot list examples for a tack with no
adjacencies. Answering the question once, here, is what stops the three drifting apart.

| Export | Answers |
|---|---|
| `loadGenericTacks()` | Resolves the host modules this needs; `false` if the host did not hand them over |
| `isGenericTack(type)` | Is this one of the pseudo-types? ⚠️ `BUILDING_CITY_HALL` is registered as a generic tack but IS a real constructible, so it is excluded |
| `membersOf(type)` | Every real constructible the tack is a stand-in for |
| `standsFor(type, constructible)` | Membership test, used by the clearing change |
| `terrainsFor(type)` | Every terrain at least one member explicitly allows |
| `representativesFor(type)` | The list the tack is **shown** to stand for — its tooltip |

### ⚠️ `membersOf` and `representativesFor` are different questions

`membersOf` is "what would fulfil this?" and includes civ-uniques and, for a class-wide tack,
every building in the age. `representativesFor` is "what should the player be shown?" — a
class-wide tack gets an empty list there, because "all forty buildings" is true and useless in a
tooltip, and uniques are dropped because a player who is not that civ cannot build them.
Conflating the two would either wreck the tooltip or under-clear tacks.

### ⚠️ An empty `terrainsFor` does not mean "nowhere"

It means no member names a terrain at all, which in the host's `canPlaceOnTerrain` is
*unrestricted*. Only the presence of a terrain in that set is information; its absence is not.

### ⚠️ Memoised per age, keyed on `Game.age`

The lists come from `GameInfo`, which is stable within an age and not across one. They are
wanted per tack per plot update, and `DMT_BUILDING` alone walks every constructible in the game
to build its list — so this cannot be recomputed on demand, and it cannot be computed once
either.
