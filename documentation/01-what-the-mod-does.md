# 01 — What the mod does

## In one line

It changes four things about how **Detailed Map Tacks** by wltk behaves. All of it is optional.

⚠️ Three of the four come from **one** fact: a generic tack is a pseudo-type the game has never
heard of, so every table keyed by `ConstructibleType` misses it. `ui/host/generic-tacks.js` is
the single answer to "what does this tack stand for", and all three read it.

⚠️ **Neither is a bug report.** Whether a generic tack should clear at all is wltk's design
call, and the deletion shortcut is a note wltk already left in the source. Keep that framing in
every document here — it is what makes these usable as suggestions rather than complaints.

## The changes it makes

| Change | What the host does today | Module |
|---|---|---|
| A generic tack is cleared once something that fulfils it is built | Its auto-removal compares tack type to built type as **strings**, so only a concrete tack ever matches | `ui/patches/generic-tack-cleanup.js` |
| Right-click a tack on the map to delete it | Deleting works on left-click only, and only while the chooser is open — wltk's own `// TODO: Come up with a better quicker deletion solution.` | `ui/patches/right-click-remove.js` |
| A generic tack may sit on coast, navigable river and mountain | Its terrain gate needs a flag only a real `ConstructibleType` can raise, so a pseudo-type is refused everywhere on water | `ui/patches/generic-tack-terrain.js` |
| The Influence tack lists example buildings, per age | It builds example lists from adjacencies only, and `DMT_BUILDING_DIPLOMACY` declares none — so its tooltip shows nothing | `ui/patches/generic-tack-representatives.js` |

Every change added later gets a row here, a `{ name, start }` entry in `ui/patches/patches.js`,
and an entry in `CHANGELOG.md` that names the host's behaviour rather than only the remedy — that is
the note that decides whether the patch can be dropped after a host update.

### Generic tack cleanup

Detailed Map Tacks removes a pin when the building it names gets built on that plot. It does
that in `MapTackChangeProcessor.onConstructibleAdded`, which asks `MapTackStore.removeMapTack`
for `{ x, y, type: <what was built> }`, and the store matches with
`item.type == mapTackData.type`. For a concrete pin those two strings are equal. For a generic
pin the type is `DMT_BUILDING_CULTURE` and never `BUILDING_MONUMENT`, so it can never match and
the pin stays on the map forever.

This mod listens to the same `ConstructibleAddedToMap` event and removes what the host missed.
A generic pin is cleared when the building that appeared **fulfils what the pin promised**,
decided by three signals in order:

1. **The host's own matching list** — `MapTackGenerics.getMatchingConstructibles()`, derived
   from `Constructible_Adjacencies`. This is also what the pin's tooltip prints, so the rule is
   exactly what the player was shown. In Antiquity `DMT_BUILDING_CULTURE` is
   {Amphitheater, Monument}, `DMT_BUILDING_SCIENCE` is {Academy, Library}, and so on for all
   three ages.
2. **The game's type tags** (`GameInfo.TypeTags`) — ⚠️ these exist only on **civ-unique**
   buildings (7 `CULTURE` rows and 3 `SCIENCE` rows in the entire game: Mastaba, Parthenon,
   Madrasa, Examination Hall…). A supplement, never a replacement — and the only signal
   `DMT_BUILDING_DIPLOMACY` has at all, since it declares no adjacencies and so has an empty
   host list.
3. **Class** for the three class-wide pins — `DMT_BUILDING`, `DMT_WONDER`, `DMT_IMPROVEMENT`
   are cleared by anything of that class.

Two guards, both of which prevent taking a plan away that is not actually finished:

- ⚠️ **Slotless buildings never count.** Walls and their kin are BUILDING class but are placed
  on their own and consume no building slot. Without the guard, a wall going up would wipe
  every "put a building here" pin in the city.
- ⚠️ **The unique-quarter pin needs both halves.** A quarter is two buildings; clearing the pin
  on the first would take the plan away half-done.

⚠️ Nothing wider than these three signals. A removed pin is a piece of the player's plan gone
and there is no undo, so under-removing is the survivable failure and over-removing is not.

### Right-click removal

`MapTackIcons.mapTackClickListener` deletes a tack on left-click **only while
`DMT_INTERFACEMODE_MAP_TACK_CHOOSER` is open**; its `else` branch is the host's own
`// TODO: Come up with a better quicker deletion solution.` Outside the chooser there is no way
to remove a tack from the map at all.

This decorates `dmt-map-tack-icons` and listens for `engine-input` **on the component**, which
is the seam the framework provides rather than a race for a listener slot:

```js
// ContextManager.handleInput
if (this.shouldSendEventToCursor(inputEvent) && Cursor.target instanceof HTMLElement) {
    Cursor.target.dispatchEvent(inputEvent);
    if (inputEvent.defaultPrevented) { return false; }   // the chain stops here
}
...
return !this.engineInputEventHandlers.some((handler) => !handler.handleInput(inputEvent));
```

`world-input` is one of those `engineInputEventHandlers` and is reached last, so a
`preventDefault()` from the component takes the click away from the world for certain.

⚠️ **That suppression is not optional.** `WorldInput.actionMouseRightButton` never checks
`Cursor.isOnUI` — it goes straight to `doActionOnPlot`. Without it, deleting a tack would also
order the selected unit to walk to that plot.

⚠️ **`START` is swallowed too**, doing nothing else: `actionMouseRightButton` draws the selected
unit's destination path on `START` and only clears it on `FINISH`, so letting `START` through
would strand a movement arrow on the map.

⚠️ **The tack is identified by POSITION.** The host hangs no identity on the icons it builds, but
`MapTackIcons.updateData` appends exactly one child per entry of `mapTackList`, in order. If the
host ever appends anything else into that container this deletes the wrong tack — re-check
`createItem` before assuming it still holds.

Removal itself goes through the host's own `RemoveMapTackRequest`, so the store, the redraw and
`CityCenterMapTackUpdated` are all handled by the host exactly as they are for its own delete.

## What the player sees today

Two options, under **Options → Mods → Detailed Map Tacks** (⚠️ the heading is named after the HOST, so map tack settings are one section — see [options](09-options-and-persistence.md)):

| Option | Key | Default | Meaning |
|---|---|---|---|
| Apply Najane's changes | `LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED` | on | Skips the whole patch list. Read once, at load. |
| Remove map tacks with right-click | `LOC_OPTIONS_NAJANE_MAP_TACKS_RIGHT_CLICK` | on | ⚠️ Read **per click**, so it takes effect at once. See [options](09-options-and-persistence.md). |

And one line in `UI.log` on load, naming the build that is actually running:

```
[najane-map-tacks] loaded, build 2026-08-24 16:04:11
```

⚠️ That line is `warn`, not `log`, so it appears with `DIAGNOSTICS = false`. It is the answer
to "is the running game running the build I just deployed?", which nothing inside the game
will tell you — scripts are loaded once.

## What it deliberately does not do

- **It does not replace any host file.** Forking a host file freezes the change at today's host
  version and silently reverts whatever wltk changes next.
- **It does not work without the host.** That is enforced by the `.modinfo`, not by intent;
  see [Architecture](02-architecture.md).
