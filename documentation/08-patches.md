# 08 — `ui/patches/`

The changes, and the only place this mod changes anything.

## `patches.js` — the one list

```js
const CHANGES = [ … ];   // { name, start }
export function startPatches() { … }
```

`startPatches()` is the only thing the entry point calls. It asks three questions, in order,
and each is asked **once, centrally**:

1. `isHostModPresent()` — `warn` and stop if not.
2. `areChangesEnabled()` — the master switch; `log` and stop if off.
3. Is anything registered at all.

⚠️ **The master switch and the host check live here, not inside each change.** A change that has to
remember to ask is a change that will forget — and the one that forgets is the one that runs when
the player has switched the mod off to test something.

Each `start()` runs inside its own `try`/`catch`: one broken change must not take the rest of the
pack with it.

Nothing but `patches.js` imports one. That is deliberate — **everything this mod does to the
host can be read off one file**, which is the question a report about it actually asks.

## Adding a change

1. **Read the host's source first**, at
   `~/Library/Application Support/Steam/steamapps/workshop/content/1295660/3507297712/`. Know
   which host function decides the behaviour before writing anything.
2. **Pick the least invasive seam** that can do it — the order is in
   [04 — The host mod](04-the-host-mod.md): decorate a component, then listen to an event, then
   wrap a singleton method through `loadHostModule()`, and only then anything heavier.
3. **One file per change**, in this folder, exporting one `startX()`. Its header says *what the
   host does today* and *why this does something else*. ⚠️ Both halves matter: the first is what
   lets the change be dropped after a host update, the second is what keeps it readable as a
   suggestion to wltk rather than a complaint about his mod.
4. **Register it** in `CHANGES` with a name that is the behaviour, not the file: the name is
   what the log prints.
5. **Row in `documentation/01-what-the-mod-does.md`**, entry in `CHANGELOG.md` saying what the
   host does today, bullet in `STEAM_CHANGELOG.bbcode`.
6. **Cost check.** Map tacks are drawn per plot and the host already walks its whole tack list
   on several events; anything added inside that walk is multiplied by the number of tacks the
   player has placed. Put the number in the `⚠️` comment.

## Shape of a decorator change

```js
import { HOST_COMPONENTS } from '../host/detailed-map-tacks.js';

class NajaneThingDecorator {
    constructor(component) { this.component = component; }
    beforeAttach() { }
    afterAttach() { }    // in the DOM - patch here
    beforeDetach() { }   // ALWAYS unsubscribe here
    afterDetach() { }
}

export function startThingChange() {
    Controls.decorate(HOST_COMPONENTS.placePanel, (c) => new NajaneThingDecorator(c));
}
```

⚠️ `Controls.decorate` must run at **script load**. The engine's own note on it: *"This will
not construct a decorator existing component instances."* By the time a panel is on screen it
is too late for that instance.

## Shape of a singleton change

```js
import { loadHostModule } from '../host/detailed-map-tacks.js';
import { warn } from '../support/diagnostics.js';

export function startStoreChange() {
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
