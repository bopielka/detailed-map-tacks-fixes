# Integrating these changes into Detailed Map Tacks

**For wltk, or anyone maintaining Detailed Map Tacks.**

This mod is an add-on that changes four things about how map tacks behave. If any of them belong
in Detailed Map Tacks itself, **please take them** — no attribution needed, no permission to ask
for. This file is what you would need to fold them into your own source, written so you never
have to read mine.

I would rather this mod became unnecessary than kept existing. Every change here works around
the fact that an add-on cannot edit your files; inside Detailed Map Tacks, most of the machinery
disappears and what is left is a handful of lines. Where that is true, it says so.

Paths below are relative to the Detailed Map Tacks mod root.

---

## What you can throw away immediately

Everything in this mod that exists only because it is a *separate* mod:

| This mod has | Why | Inside DMT |
|---|---|---|
| `ui/host/detailed-map-tacks.js` | Dynamic, caught `import()` of your modules — a static import of a file that might be missing kills the whole add-on at load | Plain `import` |
| The `Controls.decorate` wrapper in `ui/patches/right-click-remove.js` | Cannot edit your component | Edit the component |
| The singleton method wrapping in `generic-tack-terrain.js` and `generic-tack-representatives.js` | Cannot edit your methods | Edit the methods |
| Identifying a clicked tack by DOM position | Your `createItem` has no identity on the icons it builds | You have `mapTackData` in scope already |
| `ui/engine/*-setting.js`, `ui/options/` | Options to switch the add-on off | Only if you want them switchable |

`ui/host/generic-tacks.js` is the one file worth reading: it holds the data rules, and inside
your mod most of it collapses into `MapTackGenerics.cacheData()`, which already runs once per
age and already caches exactly this kind of thing.

---

## 1. Clear a generic tack once something that fulfils it is built

**Where:** `ui/map-tack-core/dmt-map-tack-change-processor.js`, `onConstructibleAdded`.

**What happens today.** You build the removal request from the constructible that was placed:

```js
const mapTackData = {
    x: data.location.x,
    y: data.location.y,
    type: GameInfo.Constructibles.lookup(data.constructibleType)?.ConstructibleType
};
MapTackStore.removeMapTack(mapTackData);
```

and `MapTackStore.getIndexOfMapTack` matches with `item.type == mapTackData.type`. For a concrete
tack those two strings are equal. For a generic one the tack's type is `DMT_BUILDING_CULTURE` and
never `BUILDING_MONUMENT`, so it never matches and the tack stays on the map.

**Whether it should clear at all is your call** — a generic tack could reasonably be meant to say
"something of this kind belongs here" permanently. This mod takes the other reading, that a tack
is a plan and a finished plan should get out of the way, and makes it optional for that reason.

**The change.** Add a membership test to `MapTackGenerics`, then use it after the existing
removal:

```js
// dmt-map-tack-generics.js
isFulfilledBy(genericType, constructibleType) {
    const generic = this.genericMapTacks.get(genericType);
    if (!generic) return false;
    const itemDef = GameInfo.Constructibles.lookup(constructibleType);
    if (!itemDef || generic.classType != itemDef.ConstructibleClass) return false;
    // Class-wide tacks: anything of that class, this age.
    if (["DMT_BUILDING", "DMT_WONDER", "DMT_IMPROVEMENT"].includes(genericType)) {
        return itemDef.Age == GameInfo.Ages.lookup(Game.age).AgeType;
    }
    if (this.getMatchingConstructibles(genericType).includes(constructibleType)) return true;
    // Civ-unique buildings, via TypeTags.
    return generic.tags.some(tag => YieldTags.has(tag) && MapTackUtils.hasTag(constructibleType, tag));
}
```

```js
// dmt-map-tack-change-processor.js, in onConstructibleAdded, after removeMapTack
for (const mapTack of MapTackStore.retrieveMapTacks(x, y).slice()) {
    if (!MapTackGenerics.isGenericMapTack(mapTack.type)) continue;
    if (MapTackUtils.isSlotless(mapTackData.type)) continue;
    if (MapTackGenerics.isGenericUniqueQuarter(mapTack.type)) continue;   // see below
    if (MapTackGenerics.isFulfilledBy(mapTack.type, mapTackData.type)) {
        MapTackStore.removeMapTack({ x, y, type: mapTack.type });
    }
}
```

**Two guards that are worth keeping**, both learned the hard way:

- ⚠️ **Slotless buildings must not count.** Walls are BUILDING class, are placed on their own and
  consume no building slot. Without the guard, a wall going up clears every "building here" tack
  in the city.
- ⚠️ **The unique-quarter tack needs both halves.** A quarter is two buildings; clearing it on
  the first takes the plan away half-done. Check the plot with `getConstructiblesAtPlot` against
  `getMatchingConstructibles("DMT_BUILDING_UNIQUE_QUARTER")` and require all of them.

**Note for you specifically:** this mod has to listen to `ConstructibleAddedToMap` a second time,
because you subscribed with `engine.on("ConstructibleAddedToMap", this.onConstructibleAdded, this)`
— which captured the function object, so replacing the method on the singleton does nothing. You
have no such problem; you can edit the handler and drop my listener entirely, including the
follow-up call to `onPlotDetailsUpdated` that this mod needs because listener order is undefined.

---

## 2. Right-click a tack on the map to delete it

**Where:** `ui/plot-icons/dmt-map-tack-icons.js`, `createItem` — right next to
`mapTackClickListener`, whose `else` branch reads
`// TODO: Come up with a better quicker deletion solution.`

**The change.** You already have `mapTackData` in scope in `createItem`, so this is much simpler
for you than for an add-on:

```js
iconWrapper.addEventListener(InputEngineEventName, (event) => {
    if (event.detail?.name != "mousebutton-right") return;
    const status = event.detail.status;
    if (status != InputActionStatuses.START && status != InputActionStatuses.FINISH) return;
    if (status == InputActionStatuses.FINISH) {
        engine.trigger("RemoveMapTackRequest", mapTackData);
    }
    event.preventDefault();
    event.stopPropagation();
});
```

**Why `engine-input` on the element rather than a DOM `mouseup`, and why `preventDefault` is not
optional.** `ContextManager.handleInput` dispatches the event to `Cursor.target` and abandons the
whole chain the moment `defaultPrevented` is set:

```js
if (this.shouldSendEventToCursor(inputEvent) && Cursor.target instanceof HTMLElement) {
    Cursor.target.dispatchEvent(inputEvent);
    if (inputEvent.defaultPrevented) { return false; }
}
...
return !this.engineInputEventHandlers.some((handler) => !handler.handleInput(inputEvent));
```

`world-input` is one of those handlers and is reached last — and ⚠️
`WorldInput.actionMouseRightButton` **never checks `Cursor.isOnUI`**, it goes straight to
`doActionOnPlot`. Without the `preventDefault`, deleting a tack also orders the selected unit to
walk to that tile.

⚠️ **Swallow `START` as well as `FINISH`.** The `START` branch of `actionMouseRightButton` draws
the selected unit's destination path and only `FINISH` clears it, so letting `START` through
strands a movement arrow on the map.

---

## 3. Let a generic tack sit on coast, navigable river and mountain

**Where:** `ui/map-tack-core/dmt-map-tack-validator.js`, `canPlaceOnTerrain`.

**What happens today.** `isValid` ends with a terrain gate that refuses `TERRAIN_COAST` and
`TERRAIN_NAVIGABLE_RIVER` unless `this.waterPlacement` was raised, and `TERRAIN_MOUNTAIN` unless
`this.mountainPlacement` was. Both are only ever raised from a real `ConstructibleType`: a
`Constructible_ValidTerrains` row in `canPlaceOnTerrain`, a `RiverPlacement` on
`GameInfo.Constructibles.lookup(type)`, or a wonder's `AdjacentToLand`. A generic tack is a
pseudo-type, so all three come back empty, the flag stays false, and every water tile is refused.

**The data says otherwise.** Constructibles with a `ValidTerrains` row on water:

| Class | Types |
|---|---|
| BUILDING (12) | `LIGHTHOUSE`, `PORT`, `WHARF`, `SHIPYARD`, `FISHING_QUAY`, `HARBOR`, `ANCIENT_BRIDGE`, `MEDIEVAL_BRIDGE`, `MODERN_BRIDGE`, `ANCIENT_WALLS`, `MEDIEVAL_WALLS`, `DEFENSIVE_FORTIFICATIONS` |
| WONDER (3) | `COLOSSUS`, `HALE_O_KEAWE`, `STATUE_OF_LIBERTY` |
| IMPROVEMENT (2) | `BANG`, `ENTREPOT` |

and `WONDER_MACHU_PIKCHU` is valid on `TERRAIN_MOUNTAIN`.

**The change.** Cache a terrain set per generic tack in `MapTackGenerics.cacheData()` — where you
already build `matchingCache`, from the same member lists — and read it in `canPlaceOnTerrain`:

```js
// dmt-map-tack-validator.js, at the top of canPlaceOnTerrain
if (MapTackGenerics.isGenericMapTack(mapTackType)) {
    if (MapTackGenerics.getValidTerrains(mapTackType).has(terrainType)) {
        if (terrainType == "TERRAIN_COAST" || terrainType == "TERRAIN_NAVIGABLE_RIVER") {
            this.waterPlacement = true;
        } else if (terrainType == "TERRAIN_MOUNTAIN") {
            this.mountainPlacement = true;
        }
        return true;
    }
}
```

⚠️ **An empty terrain set must not mean "nowhere".** Most constructibles have no
`ValidTerrains` rows at all, which in your `canPlaceOnTerrain` already means *unrestricted*. Only
the presence of a terrain in the set is information; its absence must fall through to the
existing behaviour.

⚠️ **This answers "could something of this kind stand here", not "is every requirement met".** A
Lighthouse also needs `OFF_COAST`, which a generic tack cannot promise. The alternative on the
table is a flat "no" on every water tile, which is what players report as a bug.

---

## 4. Give the Influence tack its example buildings

**Where:** `ui/map-tack-core/dmt-map-tack-generics.js`, `cacheData()`.

**What happens today.** The example list is built only
`if (genericMapTack.classType == ConstructibleClassType.BUILDING && genericMapTack.adjacencyIds.length > 0)`.
`DMT_BUILDING_DIPLOMACY` is declared with `adjacencyIds: []`, so it never gets one and
`getTooltipString` returns `undefined` — its tooltip shows no examples where Production shows
Barracks and Blacksmith.

**The change.** For a tack with no adjacency ids, derive the list from what actually pays that
yield in the current age. Give the generic definitions the yield they mean — the tag is already
there (`tags: ["AGELESS", "DIPLOMACY"]`) — and add an `else` branch to `cacheData`:

```js
// else branch, when adjacencyIds is empty
const yieldType = "YIELD_" + tagForThisGeneric;      // DIPLOMACY -> YIELD_DIPLOMACY
const paying = new Set(
    GameInfo.Constructible_YieldChanges
        .filter(row => row.YieldType == yieldType && row.YieldChange > 0)
        .map(row => row.ConstructibleType)
);
for (const e of GameInfo.Constructibles) {
    if (e.ConstructibleClass != "BUILDING") continue;
    if (e.Age != GameInfo.Ages.lookup(Game.age).AgeType) continue;
    if (!paying.has(e.ConstructibleType)) continue;
    if (MapTackUtils.hasTag(e.ConstructibleType, "UNIQUE")) continue;
    (this.matchingCache[type] ||= []).push(e.ConstructibleType);
}
```

**What that produces**, per age:

| Age | Influence buildings |
|---|---|
| Antiquity | `BUILDING_MONUMENT` (+2), `BUILDING_VILLA` (+3) |
| Exploration | `BUILDING_DUNGEON` (+4), `BUILDING_GUILDHALL` (+6) |
| Modern | `BUILDING_OPERA_HOUSE` (+6), `BUILDING_RADIO_STATION` (+9) |

⚠️ **Arena is not an influence building.** It pays Happiness +4 and Gold; it has no
`YIELD_DIPLOMACY` row and no modifier that grants one. It is a common assumption and it is wrong.

⚠️ **`BUILDING_BASILICA` is excluded on purpose.** It pays +3 Influence but carries the `UNIQUE`
tag and only one civ can build it. Your adjacency-derived lists happen to contain no uniques
either, so including it here would make this one list read differently from all the others.

⚠️ **Do not widen the lists that already exist.** `Constructible_Adjacencies` gives the right
answer where it applies — Antiquity culture is Amphitheater and Monument — and "everything that
pays culture" would be longer and vaguer. This is a fallback for an empty list, not a
replacement.

⚠️ **Class-wide tacks should keep showing nothing.** `DMT_BUILDING` stands for every building in
the age, which is true and useless in a tooltip.

---

## 5. Let the hotkey close the panel it opened

**Where:** `ui/input/dmt-hotkey-manager.js`.

**What happens today.** `open-map-tack-panel` is answered with `sendHotkeyEvent(name)`, the
mini-map decorator hears `hotkey-open-map-tack-panel` and switches to
`DMT_INTERFACEMODE_MAP_TACK_CHOOSER`. The key only opens. Pressed again it does nothing at all,
and not because nobody listens: core's `sendHotkeyEvent` dispatches only
`if (InterfaceMode.allowsHotKeys())`, and `allowsHotKeys()` returns `false` for a handler that
does not declare it — neither of your two map tack modes does. Escape is the only way out.

**The change.** In your own wrapper, before `sendHotkeyEvent`:

```js
case "open-map-tack-panel":
    const current = InterfaceMode.getCurrent();
    if (current == "DMT_INTERFACEMODE_MAP_TACK_CHOOSER" ||
        current == "DMT_INTERFACEMODE_PLACE_MAP_TACKS") {
        InterfaceMode.switchToDefault();
    } else {
        HotkeyManager.sendHotkeyEvent(name);
    }
    return false;
```

Inside your mod this is the whole change — this add-on has to wrap your wrapper from the
outside to reach the same line, which is the only reason its own version is longer.

⚠️ **Do not fix this by declaring `allowsHotKeys()` on the mode handlers.** That opens the gate
for every hotkey — `open-techs`, `quick-load` and the rest — while the tack panel is up.

⚠️ **`switchToDefault()` is your own Escape path**, so the chooser hides itself on
`InterfaceModeChanged` and the placement mode tears its overlays down in `transitionFrom`. There
is nothing extra to close.

⚠️ **From the placement mode this exits the tack UI altogether** rather than stepping back to the
chooser, which is what Escape already does. That is a choice, not a fact — stepping back would
be defensible; a key that only half-closes would not.

---

## Things I could not verify

- Whether a generic tack *should* clear at all when fulfilled, and whether the unique-quarter
  tack should wait for both halves. Both are design calls, not facts. This mod picks an answer
  and makes it switchable.
- Behaviour across an age transition. This mod memoises its lists per `Game.age` because
  `GameInfo` answers differ per age; whether your `cacheData` (run once on `engine.whenReady`)
  needs the same treatment depends on whether scripts reload on transition, which I did not test.
- Anything about gamepad or touch input. The right-click change is mouse-only by construction.

## Licence

Do whatever you want with this. No attribution needed.
