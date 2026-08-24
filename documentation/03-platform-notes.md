# 03 — Platform notes

Civ VII's UI is a Coherent GT (cohtml) DOM driving `/core/ui/`. This file records what bites
when patching somebody else's mod inside it. `../../knowledge-base/` is the general reference;
`../../better-commerce-screen-ui/documentation/03-platform-notes.md` covers the Solid/`ui-next`
side, which this mod does not touch.

## `Controls` — the component registry

`Controls` is `ComponentManager`, in `/core/ui/component-support.js`. Three of its methods
matter here.

### `Controls.define(name, definition)`

How a mod declares a component. ⚠️ **Reading its implementation is worth doing before you
consider using it on a host component name:**

```js
const existingPriority = s.definition?.priority ?? 0;
const newPriority = definition.priority ?? 0;
if (s.definition == null || newPriority >= existingPriority) {
    s.definition = definition;
}
```

The **highest priority wins, ties going to whoever defines last**. So `define`-ing over a host
component replaces its definition outright — and every other mod that has the same idea is in
the same race. This is the technique of last resort, not the default.

### ⚠️ `Controls.decorate(name, provider)` — the seam to prefer

```js
decorate(name, provider) {
    let s = this._componentData.get(name);
    if (!s) {
        s = new ComponentData();
        this._componentData.set(name, s);
    }
    s.addDecorator(provider);
}
```

**It creates the component entry if it is missing.** That single line is why decorating is the
right tool for patching another mod: it does not matter whether this mod's script ran before or
after the host's. Decorators also compose — several mods can decorate the same component
without fighting.

⚠️ From the engine's own note: *"This will not construct a decorator existing component
instances."* Decorate at **script load**, not in response to a game event. By the time a panel
is on screen it is too late for that instance.

A decorator implements the component lifecycle:

```js
class NajaneSomethingDecorator {
    constructor(component) { this.component = component; }
    beforeAttach() { }
    afterAttach() { }   // the component is in the DOM - patch here
    beforeDetach() { }  // ALWAYS unsubscribe here
    afterDetach() { }
}
Controls.decorate('dmt-panel-place-map-tack', (c) => new NajaneSomethingDecorator(c));
```

### `Controls.isDefined(name)`

A map lookup. Used by `isHostModPresent()` as the cheap first answer to "is the host running".

## Reaching the host's code

The host's singletons are default exports of its own modules (`MapTackStore`, `MapTackUtils`,
…). Module identity is the **resolved URL**, so importing
`/detailed-map-tacks/ui/map-tack-core/dmt-map-tack-store.js` gives the module the host itself
loaded — the same singleton, not a copy. Patching it patches what is running.

⚠️ That holds only for the **exact path spelling**. A different spelling of the same file is a
second module with a second singleton, and a patch applied to it does nothing at all. This is
why every path lives in one map in `ui/host/detailed-map-tacks.js` rather than being typed at
a call site.

⚠️ And never statically. See [host](07-host.md).

## Addressing a mod's own files

`fs://game/<mod-id>/<path>` for assets, `/<mod-id>/<path>` for scripts, where `<mod-id>` is the
`<Mod id>` from the `.modinfo`. Verified for `detailed-map-tacks` among others. A few Workshop
mods use an alias that does not match their id; whether those paths work at all is unknown.
Use exactly your own `<Mod id>`.

⚠️ An asset only resolves after being registered with `<ImportFiles>` in the `.modinfo`. A
missing registration shows up in `UI.log` as `Failed to open file`.

## DOM quirks

- ⚠️ **No `replaceChildren`** — calling it throws. `clearChildren` in `ui/support/dom.js`.
- ⚠️ `appendChild` is the reliable append. `appendAll` skips falsy children on purpose.
- ⚠️ An injected `div` does **not** receive the engine's `mousebutton-left` action, which is
  what the screens' own `Activatable` reacts to. Native DOM events do arrive — wire those, and
  `stopPropagation`, or whatever is underneath treats the click as its own. The sibling mods'
  `bindActivatable` is the worked version; port it when this mod first injects something
  clickable.

## Engine quirks

- ⚠️ **Engine events are raised for every player.** `UnitMoved` and friends arrive in their
  thousands per AI turn. Go through `ui/engine/events.js`, which filters.
- ⚠️ **The engine throws where a browser would return `undefined`.** Every call into the game
  gets a `try`/`catch` and a `warn`. The same goes for calls into the host, which can change
  between Workshop updates.
- ⚠️ **`console.log` never reaches `UI.log`.** Everything goes through `console.error`; see
  [support](05-support.md).
- ⚠️ **Scripts load once per session.** Deploying mid-game changes the files and nothing else.
  The build stamp line exists to make that visible.
