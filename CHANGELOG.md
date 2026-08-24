# Changelog

All notable changes to **Detailed Map Tacks Fixes by Najane**.

⚠️ Every entry that fixes something in the host mod says **what the host does wrong**, not only
what this mod now does. That is the note that decides, after a Detailed Map Tacks update,
whether the patch can be dropped or has to be re-checked.

⚠️ Written twice, in the same pass: this file carries the cause and the reasoning,
`STEAM_CHANGELOG.bbcode` carries one bullet per change for the Workshop change-note box.

## 0.1 — in progress

### Fixed

- **Generic map tacks are now cleared when what they stand for gets built.**

  *What the host does wrong:* `MapTackChangeProcessor.onConstructibleAdded` hands
  `MapTackStore.removeMapTack` a `{ x, y, type: <the constructible that was built> }`, and the
  store matches it with `item.type == mapTackData.type` — a plain string comparison. A
  concrete pin works because the two strings are equal. A generic pin's type is
  `DMT_BUILDING_CULTURE`, never `BUILDING_MONUMENT`, so it can never match and the pin stays
  on the map for the rest of the game.

  *Why it could not be patched in place:* the host subscribed with
  `engine.on("ConstructibleAddedToMap", this.onConstructibleAdded, this)`, which captured the
  function object at subscription time — replacing the method on the singleton afterwards
  changes nothing. So this mod listens to the same event and removes what the host missed,
  then calls the host's own `onPlotDetailsUpdated` so the map redraws at once rather than next
  turn.

  *How "fulfils" is decided,* in order: the host's own matching list
  (`getMatchingConstructibles`, derived from `Constructible_Adjacencies` — and the same list
  the pin's tooltip already prints to the player); then `GameInfo.TypeTags`; then class, for
  the three class-wide pins. ⚠️ The tags only ever cover **civ-unique** buildings — 7 `CULTURE`
  and 3 `SCIENCE` rows in the whole game — so they are a supplement, not a basis. They are
  however the only signal `DMT_BUILDING_DIPLOMACY` has, that pin declaring no adjacencies.

  *Two things deliberately do not count:* slotless buildings (walls are BUILDING class and are
  placed on their own — without the guard a wall would wipe every "building here" pin in the
  city), and the first half of a unique quarter (a quarter is two buildings; clearing the pin
  early takes the plan away half-done).

  ⚠️ Drop this patch if a Detailed Map Tacks update starts clearing generic pins itself.

### Added

- **Right-click a map tack on the map to delete it.** New option **Remove map tacks with
  right-click** (Options → Mods), on by default.

  *What the host lacks:* `MapTackIcons.mapTackClickListener` deletes a tack on left-click only
  while the chooser interface mode is open. Its `else` branch is wltk's own
  `// TODO: Come up with a better quicker deletion solution.` — outside the chooser there is no
  way to remove a tack from the map at all.

  *How it hooks in:* a decorator on `dmt-map-tack-icons` listening for `engine-input` **on the
  component**, not a DOM mouse event and not a window capture listener.
  `ContextManager.handleInput` dispatches the event to `Cursor.target` and abandons the whole
  chain once `defaultPrevented` is set, and `world-input` is reached last — so this is the
  framework's own way for a component to take an input away from the world, with no race.

  ⚠️ *The suppression is not optional:* `WorldInput.actionMouseRightButton` never checks
  `Cursor.isOnUI`, it goes straight to `doActionOnPlot`. Without it, deleting a tack would also
  order the selected unit to walk to that plot. `START` is swallowed as well as `FINISH`,
  because the `START` branch draws the unit's destination path and only `FINISH` clears it.

  ⚠️ *The tack is identified by position* — the host hangs no identity on the icons, but
  `updateData` appends one child per `mapTackList` entry in order. Re-check `createItem` if the
  host changes.

  Removal goes through the host's own `RemoveMapTackRequest`, so the store, the redraw and
  `CityCenterMapTackUpdated` behave exactly as they do for the host's own delete.

  ⚠️ *The option is read per click, not at registration.* The decorator is registered whatever
  the setting says — deciding at load would leave the option doing nothing until a restart.

### Changed

- **The options now sit under a "Detailed Map Tacks" heading** instead of a separate block of
  their own, so a player looking for map tack settings finds one section. The host adds nothing
  to the options screen itself — its only stored setting, the placement preview radius, lives in
  its own catalog and is changed from inside its placement mode — so there is no group to
  genuinely share and the heading text is what does the merging. Attribution moved into the
  label, which now reads "Apply Najane's fixes" rather than repeating the host's name under the
  host's own heading.

### Fixed (this mod's own bug)

- **The options section printed `LOC_OPTIONS_GROUP_NAJANE_MAP_TACKS` as its title.** ⚠️ The game
  derives the heading's localisation key from the group id and has no fallback: a missing key is
  shown raw on screen. The key was never added. It is now in all twelve locales.

### Removed

- **Everything nothing reached.** `ui/support/dom.js` (four helpers, no caller — this mod draws
  nothing of its own), `storedChoice`, the engine-events owner filter and `stopEngineEvents`,
  the two setting-changed events nothing listened to, `stopGenericTackCleanup`, and the host
  paths and component names no patch loads. 829 lines of `ui/` left, all of it reached.

  ⚠️ Each of those exists in `../better-commerce-screen-ui`, is named in `documentation/` at
  the place it would go, and is a copy away. Kept-for-later code cannot be tested and quietly
  stops matching the mod it was copied from.

### Groundwork

- **New mod.** An add-on to Detailed Map Tacks by wltk, structured as `support → engine →
  host → patches`. `ui/host/detailed-map-tacks.js` is the single file that names the host, so
  a host update breaks in one place rather than in every fix.
- **Hard dependency on the host.** `detailed-map-tacks` is declared in `<Dependencies>`, not
  `<References>`: the game will not apply this mod's components without it, so a player who
  installs only this one gets nothing rather than a wall of errors.
- **Load order 2000**, above the host's default. A patch registered before the host defines
  the thing it patches does nothing, silently.
- **Master switch** under Options → Mods, on by default. A fixes pack can turn into the bug
  the moment the host updates; this lets a player rule the mod out of a problem without
  unsubscribing from it.
- Twelve locales, matching the sibling mods. `text/ru_RU/` holds Ukrainian — see the note in
  the file.
