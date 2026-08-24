# 08 — `ui/patches/`

The fixes, and the only place this mod changes anything.

## `patches.js` — the one list

```js
const FIXES = [];   // { name, start }
export function startPatches() { … }
```

`startPatches()` is the only thing the entry point calls. It asks three questions, in order,
and each is asked **once, centrally**:

1. `isHostModPresent()` — `warn` and stop if not.
2. `areFixesEnabled()` — the master switch; `log` and stop if off.
3. Is anything registered at all.

⚠️ **The master switch and the host check live here, not inside each fix.** A fix that has to
remember to ask is a fix that will forget — and the one that forgets is the one that runs when
the player has switched the mod off to test something.

Each `start()` runs inside its own `try`/`catch`: one broken fix must not take the rest of the
pack with it.

Nothing but `patches.js` imports a fix. That is deliberate — **what this mod does to the host
can be read off one file**, which is the question a bug report actually asks.

## Adding a fix

1. **Reproduce it against the host's source**, at
   `~/Library/Application Support/Steam/steamapps/workshop/content/1295660/3507297712/`. Know
   which host function is wrong before writing anything.
2. **Pick the least invasive seam** that can fix it — the order is in
   [04 — The host mod](04-the-host-mod.md): decorate a component, then listen to an event, then
   wrap a singleton method through `loadHostModule()`, and only then anything heavier.
3. **One file per fix**, in this folder, exporting one `startX()`. Its header says *what the
   host does wrong* — that is what lets the patch be dropped after a host update.
4. **Register it** in `FIXES` with a name that is the bug, not the file: the name is what the
   log prints.
5. **Row in `documentation/01-what-the-mod-does.md`**, entry in `CHANGELOG.md` naming the host
   bug, bullet in `STEAM_CHANGELOG.bbcode`.
6. **Cost check.** Map tacks are drawn per plot and the host already walks its whole tack list
   on several events; anything added inside that walk is multiplied by the number of tacks the
   player has placed. Put the number in the `⚠️` comment.

## Shape of a decorator fix

```js
import { HOST_COMPONENTS } from '../host/detailed-map-tacks.js';

class NajaneThingDecorator {
    constructor(component) { this.component = component; }
    beforeAttach() { }
    afterAttach() { }    // in the DOM - patch here
    beforeDetach() { }   // ALWAYS unsubscribe here
    afterDetach() { }
}

export function startThingFix() {
    Controls.decorate(HOST_COMPONENTS.placePanel, (c) => new NajaneThingDecorator(c));
}
```

⚠️ `Controls.decorate` must run at **script load**. The engine's own note on it: *"This will
not construct a decorator existing component instances."* By the time a panel is on screen it
is too late for that instance.

## Shape of a singleton fix

```js
import { loadHostModule } from '../host/detailed-map-tacks.js';
import { warn } from '../support/diagnostics.js';

export function startStoreFix() {
    loadHostModule('store').then((module) => {
        const store = module?.default;
        if (!store) { return; }
        const original = store.retrieveMapTacks.bind(store);
        store.retrieveMapTacks = (x, y, fromStore) => { … original(x, y, fromStore) … };
    });
}
```

⚠️ Wrap, do not replace: call the original. A patch that reimplements a host method inherits
every future host change as a regression.

⚠️ Async by construction — see [host](07-host.md). Nothing may assume the wrap is in place by
the time `startPatches()` returns.
