# 06 — `ui/engine/`

Talking to the game. This layer knows about `engine`, `UI`, `GameContext` and friends — and
**nothing about the host**. That is what makes it survivable: if Detailed Map Tacks is renamed
or replaced, nothing in this folder changes.

## `events.js` — the one door for `engine.on`

Shared with the sibling mods, and the same reasoning applies.

⚠️ **Engine events are raised for EVERY player.** `UnitMoved` and friends arrive in their
thousands during an AI turn, so a handler that does not filter runs thousands of times to
conclude that somebody else's scout moved. `onLocalPlayerEvent` drops everybody else's before
the handler is ever called.

⚠️ **An UNKNOWN owner is never filtered out.** A dropped trigger looks exactly like a feature
that does nothing.

⚠️ **ONE engine subscription per event name**, however many listeners want it. The owner is
resolved at most once per event, lazily — a name whose listeners are all unfiltered never asks
at all, which matters because a payload carrying only a `location` is answered with a map
query.

⚠️ **The HANDLE is the identity, not the function.** `engine.off` only ever sees the shared
dispatcher, so a listener that must be removable has to keep the handle `onEngineEvent`
returned and pass it to `stopEngineEvents`.

```js
const handles = onEngineEvents(['ConstructibleAddedToMap', 'ConstructibleRemovedFromMap'], onChanged);
// ... later
stopEngineEvents(handles);
```

`logEventStats()` prints per-event counts and milliseconds since the last call, with
diagnostics on. It is the first measurement to take when the report is "the game runs slowly".

## `stored-setting.js` — a setting that survives a restart

`storedSwitch({ option, defaultValue, label, changedEventName })` and `storedChoice({ … })`.

⚠️ **The offset is the whole reason this is not a one-liner.** `UI.getOption` answers `0` for
an option that was never set, which is indistinguishable from one deliberately set to `0` —
harmless while every default is "off", fatal the moment a default is "on". So nothing is stored
raw: a switch stores 1 for off and 2 for on, a choice its index plus one.

⚠️ **Written to BOTH `UI.setOption` and `saveCheckpoint()`.** Without the checkpoint the value
is remembered for the session and forgotten on exit, which reads as a switch that does not
stick.

⚠️ `window.dispatchEvent` from `engine/` is a deliberate exception to the layer rule: a setting
has to be able to announce itself to whatever is drawing it.

## `fixes-setting.js` — the master switch

`areFixesEnabled()` / `setFixesEnabled(value)`, defaulting to **on**.

It exists because of what this mod is. A fixes pack sits on top of somebody else's mod, and
when the host updates a patch can go from fixing a bug to being the bug. One switch lets a
player rule this mod out of a problem without unsubscribing from it — the difference between a
useful report and "I removed everything and it went away".

⚠️ It lives here rather than in `ui/options/` because **the options module also loads in shell
scope**, where there is no game. The options file may import no further down than this module,
and this module must do nothing at import time beyond building a closure. See
[options](09-options-and-persistence.md).
