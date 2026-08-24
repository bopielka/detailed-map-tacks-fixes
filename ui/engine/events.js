/**
 * Every `engine.on` this mod makes.
 *
 * ⚠️ ONE engine subscription per event name, however many listeners want it. Several patches
 * end up wanting the same handful, and detailed-map-tacks is subscribed to some of them too.
 *
 * ⚠️ Engine events are raised for EVERY player. `UnitMoved` and friends arrive in their
 * thousands during an AI turn, so a handler that does nothing to rule an event out runs
 * thousands of times to conclude that somebody else's scout moved. There is deliberately NO
 * owner filter here: this mod's one subscriber asks "does this plot hold any map tacks?"
 * first, which is a single object lookup and cheaper than resolving an owner - a payload
 * carrying only a `location` costs a map query to attribute. A fix that genuinely needs to
 * filter by player should port `onLocalPlayerEvent` back from
 * ../better-commerce-screen-ui/ui/engine/events.js rather than reinvent it.
 */
import { DIAGNOSTICS, log, warn } from '../support/diagnostics.js';

/** name -> `{ listeners, dispatch }`, listeners in subscription order. */
const byName = new Map();

// Counted only with diagnostics on; see logEventStats.
const counts = DIAGNOSTICS ? new Map() : null;
const millis = DIAGNOSTICS ? new Map() : null;

function now() {
    return typeof performance?.now === 'function' ? performance.now() : Date.now();
}

function deliver(entry, name, data) {
    // A listener may unsubscribe from inside its own handler; iterate over a copy.
    for (const handler of Array.from(entry.listeners)) {
        try {
            handler(data);
        } catch (error) {
            warn(`a handler for ${name} failed: ${error}`);
        }
    }
}

/** Subscribes `handler` to the engine event `name`. */
export function onEngineEvent(name, handler) {
    let entry = byName.get(name);
    if (!entry) {
        entry = { listeners: [], dispatch: null };
        entry.dispatch = (data) => {
            if (!DIAGNOSTICS) {
                deliver(entry, name, data);
                return;
            }
            const started = now();
            deliver(entry, name, data);
            counts.set(name, (counts.get(name) ?? 0) + 1);
            millis.set(name, (millis.get(name) ?? 0) + (now() - started));
        };
        try {
            engine.on(name, entry.dispatch);
        } catch (error) {
            warn(`could not listen for ${name}: ${error}`);
            return;
        }
        byName.set(name, entry);
    }
    entry.listeners.push(handler);
}

/**
 * Per event name: how many arrived since the last call and how many ms this mod spent on them.
 * Diagnostics only, and the first measurement to take when the report is "the game runs slowly".
 */
export function logEventStats() {
    if (!DIAGNOSTICS || counts.size === 0) {
        return;
    }
    const rows = [...counts]
        .map(([name, count]) => ({ name, count, ms: millis.get(name) ?? 0 }))
        .sort((a, b) => b.ms - a.ms);
    const total = rows.reduce((sum, row) => sum + row.ms, 0);
    log(
        `engine events since the last report: ${Math.round(total)}ms total - ` +
            rows.map((row) => `${row.name} x${row.count} ${Math.round(row.ms)}ms`).join(', '),
    );
    counts.clear();
    millis.clear();
}
