# 06 — `ui/engine/`

Talking to the game. This layer knows about `engine`, `UI`, `GameContext` and friends — and
**nothing about the host**. That is what makes it survivable: if Detailed Map Tacks is renamed
or replaced, nothing in this folder changes.

## `events.js` — the one door for `engine.on`

`onEngineEvent(name, handler)` and `logEventStats()`.

⚠️ **ONE engine subscription per event name**, however many listeners want it. Several patches
end up wanting the same handful, and the host is subscribed to some of them too.

⚠️ **Engine events are raised for EVERY player**, and `UnitMoved` and friends arrive in their
thousands during an AI turn — so a handler that does nothing to rule an event out runs
thousands of times to conclude that somebody else's scout moved.

⚠️ **There is deliberately no owner filter here.** The sibling mods have one; this mod's single
subscriber (`generic-tack-cleanup.js`) rules events out with "does this plot hold any map
tacks?", which is one object lookup and *cheaper* than resolving an owner — a payload carrying
only a `location` costs a map query to attribute. The host does not filter this event either.
A change that genuinely needs to filter by player should port `onLocalPlayerEvent` back from
`../better-commerce-screen-ui/ui/engine/events.js` rather than reinvent it.

⚠️ **Nothing unsubscribes**, so there are no handles. Scripts load once, patches start once and
never stop. `stopEngineEvents` exists in the sibling mods for screens that mount and unmount;
port it if a change ever needs one.

`logEventStats()` prints per-event counts and milliseconds since the last call, with
diagnostics on. It is the first measurement to take when the report is "the game runs slowly".

## `stored-setting.js` — a setting that survives a restart

`storedSwitch({ option, defaultValue, label })`. ⚠️ Switches only — the sibling mods'
`storedChoice` (dropdowns) is not here because neither option needs one.

⚠️ **The offset is the whole reason this is not a one-liner.** `UI.getOption` answers `0` for
an option that was never set, which is indistinguishable from one deliberately set to `0` —
harmless while every default is "off", fatal the moment a default is "on". So nothing is stored
raw: a switch stores 1 for off and 2 for on, a choice its index plus one.

⚠️ **Written to BOTH `UI.setOption` and `saveCheckpoint()`.** Without the checkpoint the value
is remembered for the session and forgotten on exit, which reads as a switch that does not
stick.

⚠️ **A setting change raises no event.** The sibling mods dispatch one so a live screen can
redraw; here nothing can react — the master switch takes effect on the next load and
right-click removal is re-read on every click. Add the announcement back with the first thing
that could listen to it.

## The two settings

`changes-setting.js` — `areChangesEnabled()` / `setChangesEnabled()`, default **on**.
`right-click-remove-setting.js` — `isRightClickRemoveEnabled()` / `setRightClickRemoveEnabled()`,
default **on**.

It exists because of what this mod is. An add-on sits on top of somebody else's mod, and
when the host updates, a change that improved it can become the thing in the way. One switch lets a
player rule this mod out of a problem without unsubscribing from it — the difference between a
useful report and "I removed everything and it went away".

⚠️ **When each is read is a design decision** — the master switch once, at load; right-click
removal per click. See [options](09-options-and-persistence.md).

⚠️ They live here rather than in `ui/options/` because **the options module also loads in shell
scope**, where there is no game. The options file may import no further down than these, and
they must do nothing at import time beyond building a closure.
