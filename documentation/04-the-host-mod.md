# 04 — The host mod: Detailed Map Tacks

Everything in this document is about **somebody else's code**. It is a map, not a
specification — wltk owes this mod no stability. Re-read the source when a change stops working.

- **Mod id:** `detailed-map-tacks`
- **Author:** wltk
- **Workshop id:** 3507297712
- **Source on disk (macOS):**
  `~/Library/Application Support/Steam/steamapps/workshop/content/1295660/3507297712/`

⚠️ That folder is the reference for every question about the host. Read it rather than
guessing; it is plain, unminified ES modules.

## What it does in game

Adds placeable "map tacks" — planned buildings, wonders, improvements and quarters pinned to
plots — with validity checking and yield previews, its own lens, its own chooser and placement
panels, and a hotkey. It stores tacks per plot in a serialised catalog.

## How it is laid out

| Folder | What is in it |
|---|---|
| `ui/map-tack-core/` | The model. Store, utils, validator, yield calculation, constants, the modifier readers under `modifier/`. |
| `ui/map-tack-chooser/` | The chooser panel (`dmt-map-tack-chooser`), with its own HTML and CSS. |
| `ui/place-map-tack/` | The placement panel (`dmt-panel-place-map-tack`). |
| `ui/plot-icons/` | Drawing tacks on the map: the icon component, the icons manager, the city-radius manager, plus decorators of the game's own `plot-icons-root` and `plot-icon-suggested-settlement`. |
| `ui/lenses/` | `dmt-map-tack-lens` and its layer. |
| `ui/interface-modes/` | `DMT_INTERFACEMODE_MAP_TACK_CHOOSER`, `DMT_INTERFACEMODE_PLACE_MAP_TACKS`. |
| `ui/mini-map/`, `ui/input/`, `ui/options/`, `ui/views/` | Decorators of the game's mini-map and lens panel, the hotkey manager, the keyboard-mapping editor decorator, the placement view. |

Its `.modinfo` has a **shell** group (only the keyboard-mapping decorator, `config/Input.xml`
and the input text) and a **game** group with everything else, plus `data/interface-modes.xml`.
It declares no `<LoadOrder>`.

## The seams, in the order to reach for them

### 1. `Controls.decorate` on a component it defines

| Constant in `ui/host/detailed-map-tacks.js` | Component |
|---|---|
| `HOST_COMPONENTS.placePanel` | `dmt-panel-place-map-tack` |
| `HOST_COMPONENTS.chooser` | `dmt-map-tack-chooser` |
| `HOST_COMPONENTS.icon` | the map tack icon component |

No import, cannot fail at load time, order-independent, composes with other mods. Always the
first thing to try. See [Platform notes](03-platform-notes.md).

### 2. Its singletons, through `loadHostModule()`

The core modules each end with a singleton default export:

```js
const MapTackStore = MapTackStoreSingleton.getInstance();
export { MapTackStore as default };
```

`MapTackStore` holds `cacheMap` (plot key → list of tack data) and a `Catalog("DMT")`, and
exposes `addMapTack`, `removeMapTack`, `updateMapTacks`, `retrieveMapTacks`,
`getCachedMapTackStructs`, `getSetting`, `updateSetting`. `MapTackIconsManager` holds the icon
root and a per-plot lookup, and listens for the host's own `MapTackUIUpdated` engine event.

Reaching one of these through `loadHostModule()` gives the instance the host is using, so
wrapping a method patches the running host. ⚠️ It is async and it must be — see
[host](07-host.md).

### 3. Its custom events and interface modes

The host raises `MapTackUIUpdated` on the engine and a `map-tack-icons-root-update` DOM
CustomEvent. Its interface modes are `DMT_INTERFACEMODE_MAP_TACK_CHOOSER` and
`DMT_INTERFACEMODE_PLACE_MAP_TACKS`; its lens is `dmt-map-tack-lens`. Listening is the least
invasive patch there is, when it is enough.

⚠️ **Neither mode handler declares `allowsHotKeys()`**, and core returns `false` for a handler
that does not — so while either is current, `HotkeyManager.sendHotkeyEvent` dispatches no
`hotkey-*` window event at all, the host's own `hotkey-open-map-tack-panel` included. A key
wanted while the panel is open has to be caught in `HotkeyManager.handleInput`, which is where
the host itself takes `open-map-tack-panel` (`ui/input/dmt-hotkey-manager.js`) and where
`patches/hotkey-toggles-panel.js` wraps a second time. ⚠️ That wrapper only works from
**outside** the host's — the host's returns `false` for the action without calling on.

### 4. `Controls.define` over one of its components

Last resort. It replaces the host's definition and races every other mod with the same idea.
See the priority rule in [Platform notes](03-platform-notes.md).

## What never to do

⚠️ **Do not fork a host file into this mod.** A copy is frozen at today's host version, and it
silently reverts whatever wltk changes next. `tile-labeling-mod` (Workshop 3726413243) ships a
copy of the `dmt-*` files; that is a fork of the mod, not an add-on to it, and it is the thing
this mod is deliberately not.

## Neighbours worth knowing about

`bz-map-trix` names `detailed-map-tacks` in `<References>` and maps both of its interface modes
to `dmt-map-tack-lens`. If a change here touches lenses or interface modes, check that mod's
behaviour before blaming the host.
