# Changelog

All notable changes to **Detailed Map Tacks Tweaks by Najane**.

⚠️ **These are proposed changes, not bug reports.** Every entry says what the host does *today*
and why this mod does something else — not "what the host gets wrong". Whether a generic tack
should clear at all is wltk's design call, and the deletion shortcut is a note wltk already left
in the source. Keep that framing: it is what makes an entry usable as a suggestion, and it is
also the note that decides, after a Detailed Map Tacks update, whether a change can be dropped.

⚠️ Written twice, in the same pass: this file carries the cause and the reasoning,
`STEAM_CHANGELOG.bbcode` carries one bullet per change for the Workshop change-note box.

## 0.2 — in progress

### Added

- **A generic tack may sit on coast, navigable river and mountain where the buildings it stands
  for can.**

  *What the host does today:* `MapTackValidator.isValid` ends with a terrain gate that refuses
  `TERRAIN_COAST` and `TERRAIN_NAVIGABLE_RIVER` unless `this.waterPlacement` was raised, and
  `TERRAIN_MOUNTAIN` unless `this.mountainPlacement` was. Both are only ever raised from a real
  `ConstructibleType` — a `Constructible_ValidTerrains` row, a `RiverPlacement`, or a wonder's
  `AdjacentToLand`. A generic tack is a pseudo-type the game has never heard of, so every lookup
  comes back empty, the flag stays false and the gate refuses it.

  *Why change it:* the data disagrees. **12 BUILDING-class constructibles** carry a water
  `ValidTerrains` row — Lighthouse, Port, Wharf, Shipyard, Fishing Quay, Harbor, the three
  bridges and walls on coast — plus 3 wonders (Colossus, Hale O Keawe, Statue of Liberty) and 2
  improvements, and Machu Picchu is valid on `TERRAIN_MOUNTAIN`.

  ⚠️ *The seam is `canPlaceOnTerrain`, not `isValid`.* `isValid` sets `this.waterPlacement = false`
  on entry and reads it at the end, so there is no way in from outside; `canPlaceOnTerrain` is
  where the host itself raises the flag and is dispatched through `this`, so it can be replaced
  on the singleton. Wrapping `isValid` would mean guessing from localised reason strings which
  check had failed.

  ⚠️ *This answers "could something of this kind stand here", not "is every requirement met".* A
  Lighthouse also needs `OFF_COAST`, which a generic tack cannot promise — but a tack is a plan,
  and the behaviour it replaces is a flat "no" on every water tile.

- **The Influence tack now lists example buildings, per age.**

  *What the host does today:* `MapTackGenerics.cacheData` builds each tack's example list from
  `Constructible_Adjacencies`, and only `if (genericMapTack.adjacencyIds.length > 0)`.
  `DMT_BUILDING_DIPLOMACY` is declared with `adjacencyIds: []`, so it never gets a list and
  `getTooltipString` returns undefined — its tooltip shows no examples at all, where Production
  shows Barracks and Blacksmith.

  *Where the list comes from:* `Constructible_YieldChanges`, the only description of an influence
  building the data offers, filtered to the current age. Antiquity gives **Monument and Villa**,
  Exploration **Dungeon and Guildhall**, Modern **Opera House and Radio Station**.

  ⚠️ *Arena is not an influence building* — it pays Happiness +4 and Gold, never Influence.
  ⚠️ *Basilica is left out* although it pays +3 Influence: it is `UNIQUE`-tagged and only Rome
  can build it, and the host's own lists contain no uniques either.

  ⚠️ *An existing list is never widened, and a class-wide tack still gets none.* The
  adjacency-derived lists are right where they exist — Antiquity culture is Amphitheater and
  Monument — and "everything that pays culture" would be longer and vaguer. `DMT_BUILDING` stands
  for every building in the age, which is true and useless in a tooltip.

  Patched at the list (`getMatchingConstructibles`) rather than at the tooltip, so everything
  reading it agrees — including `MapTackUtils.getMapTackTypePlots`, which uses the same list to
  find which plots you planned a given building on.

### Changed

- **What a generic tack stands for now lives in one module**, `ui/host/generic-tacks.js`, shared
  by the three changes that need it. It was inlined in the clearing change; the terrain and
  example-list changes ask the same question, and three answers that could drift apart is one too
  many. Memoised per age, keyed on `Game.age`.

  ⚠️ One behaviour change falls out: the class-wide `DMT_BUILDING` tack is now age-filtered,
  matching the host's own `cacheData`. A tack is a plan for this age.

- **`INTEGRATING.md`**, written for wltk: where each change goes in Detailed Map Tacks' own
  source, the minimal edit, which guards are worth keeping and why, and the data behind each one
  — the water-terrain table, the influence buildings per age, and the two facts that are easy to
  get wrong (Arena pays no Influence; Basilica is `UNIQUE`). It is written so the source of this
  mod never has to be read: most of what is here exists only because an add-on cannot edit
  someone else's files, and inside the host it collapses to a handful of lines.

## 0.1

Two optional changes, both switchable, plus the groundwork under them.

### Added

- **A generic map tack is cleared once something that fulfils it is built.**

  *What the host does today:* `MapTackChangeProcessor.onConstructibleAdded` hands
  `MapTackStore.removeMapTack` a `{ x, y, type: <the constructible that was built> }`, and the
  store matches it with `item.type == mapTackData.type` — a plain string comparison. A concrete
  tack clears because the two strings are equal. A generic tack's type is `DMT_BUILDING_CULTURE`,
  never `BUILDING_MONUMENT`, so it never matches and stays on the map.

  *Why change it:* a tack is a plan, and a finished plan is in the way. ⚠️ That is a reading, not
  a defect — a generic tack could just as well be meant to say "something of this kind belongs
  here" permanently. Hence the option.

  *Why it could not be done in place:* the host subscribed with
  `engine.on("ConstructibleAddedToMap", this.onConstructibleAdded, this)`, which captured the
  function object at subscription time — replacing the method on the singleton afterwards
  changes nothing. So this mod listens to the same event and clears what the host leaves, then
  calls the host's own `onPlotDetailsUpdated` so the map redraws at once rather than next turn.

  *How "fulfils" is decided,* in order: the host's own matching list
  (`getMatchingConstructibles`, derived from `Constructible_Adjacencies` — and the same list the
  tack's tooltip already prints to the player); then `GameInfo.TypeTags`; then class, for the
  three class-wide tacks. ⚠️ The tags only ever cover **civ-unique** buildings — 7 `CULTURE` and
  3 `SCIENCE` rows in the whole game — so they are a supplement, not a basis. They are however
  the only signal `DMT_BUILDING_DIPLOMACY` has, that tack declaring no adjacencies.

  *Two things deliberately do not count:* slotless buildings (walls are BUILDING class and are
  placed on their own — without the guard a wall would clear every "building here" tack in the
  city), and the first half of a unique quarter (a quarter is two buildings; clearing the tack
  early takes the plan away half-done).

  ⚠️ Drop this if a Detailed Map Tacks update starts clearing generic tacks itself.

- **Right-click a map tack on the map to delete it.** Option **Remove map tacks with
  right-click**, on by default.

  *What the host does today:* `MapTackIcons.mapTackClickListener` deletes a tack on left-click
  only while the chooser interface mode is open. Its `else` branch is wltk's own
  `// TODO: Come up with a better quicker deletion solution.` — so this is the missing half of
  something already planned, not a defect.

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

- **The options sit under a "Detailed Map Tacks" heading** rather than a block of their own, so
  a player looking for map tack settings finds one section. The host adds nothing to the options
  screen itself — its only stored setting, the placement preview radius, lives in its own catalog
  and is changed from inside its placement mode — so there is no group to genuinely share and the
  heading text is what does the merging. Matching its group **id** would merge them for real if
  it ever adds options.

- **Framing throughout: proposals, not fixes.** The mod is called *Tweaks*, the master switch
  reads "Apply Najane's changes", and every document says what the host does *today* rather than
  what it gets wrong. The Steam description and the README invite wltk to take either change into
  Detailed Map Tacks itself, with the source at
  <https://github.com/bopielka/detailed-map-tacks-fixes>.

  The `.modinfo` is now `detailed-map-tacks-tweaks-by-najane.modinfo`, and `deploy.sh` carries
  the filename and the mod id as two separate variables.

  ⚠️ The `<Mod id>`, the repository folder and the **stored option keys** keep their original
  `…-fixes-…` spelling. The id namespaces the stored options and names the deployed folder:
  renaming it would silently reset every toggle and leave the old folder behind as a second,
  older copy of this mod that still loads. The game does not require the `.modinfo` filename to
  match the id — 17 of 50 installed Workshop mods differ, and all of them load.

### Fixed (this mod's own bug)

- **The options section printed `LOC_OPTIONS_GROUP_NAJANE_MAP_TACKS` as its title.** ⚠️ The game
  derives the heading's localisation key from the group id and has no fallback: a missing key is
  shown raw on screen. The key was never added. It is now in all twelve locales.

### Removed

- **Everything nothing reached.** `ui/support/dom.js` (four helpers, no caller — this mod draws
  nothing of its own), `storedChoice`, the engine-events owner filter and `stopEngineEvents`,
  the two setting-changed events nothing listened to, `stopGenericTackCleanup`, and the host
  paths and component names nothing loads.

  ⚠️ Each of those exists in `../better-commerce-screen-ui`, is named in `documentation/` at the
  place it would go, and is a copy away. Kept-for-later code cannot be tested and quietly stops
  matching the mod it was copied from.

### Groundwork

- **New mod.** An add-on to Detailed Map Tacks by wltk, structured as `support → engine → host
  → patches`. `ui/host/detailed-map-tacks.js` is the single file that names the host, so a host
  update breaks in one place rather than everywhere.
- **Hard dependency on the host.** `detailed-map-tacks` is declared in `<Dependencies>`, not
  `<References>`: the game will not apply this mod's components without it, so a player who
  installs only this one gets nothing rather than a wall of errors.
- **Load order 2000**, above the host's default. A decorator registered before the host defines
  the thing it decorates does nothing, silently.
- **Master switch** under Options → Mods, on by default. An add-on can turn into the problem the
  moment the host updates; this lets a player rule this mod out without unsubscribing from it.
- Twelve locales. `text/ru_RU/` holds Ukrainian — see the note in the file.
