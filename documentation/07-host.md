# 07 — `ui/host/`

One file: `detailed-map-tacks.js`. It is the **only** place in this mod that names the host.

What is in it, and why the whole layer exists, is in [04 — The host mod](04-the-host-mod.md);
this document is about using it.

## What it exports

| Export | For |
|---|---|
| `HOST_MOD_ID` | `'detailed-map-tacks'` |
| `HOST_MODULES` | Path per host module, keyed: `store`, `utils`, `uiUtils`, `generics`, `validator`, `yield`, `constants`, `iconsManager` |
| `HOST_COMPONENTS` | The component names to decorate |
| `HOST_INTERFACE_MODES`, `HOST_LENS` | The host's interface modes and lens |
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
a patch.**

## `isHostModPresent()`

Two answers, cheapest first:

1. `Controls.isDefined(...)` on the host's components — a map lookup.
2. `Modding.getInstalledMods()` — slower, but does not depend on load order, so it still
   answers if the host's scripts have not run yet.

Asked **at most once**: it is called from patch registration at script load, and the answer
cannot change afterwards, because scripts are loaded once per session.

⚠️ A false here should be impossible — the `.modinfo` `<Dependencies>` entry stops this mod
applying without the host. Reaching it means the host failed to load, and that is the entire
explanation for "the fixes mod does nothing", so `startPatches()` says so with `warn` rather
than `log`.
