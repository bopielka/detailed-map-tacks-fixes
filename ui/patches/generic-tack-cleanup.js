/**
 * Clear a generic map tack once something that fulfils it has been built.
 *
 * ⚠️ WHAT THE HOST DOES TODAY, exactly. `MapTackChangeProcessor.onConstructibleAdded` builds
 * `{ x, y, type: <the constructible that was built> }` and hands it to
 * `MapTackStore.removeMapTack`, whose `getIndexOfMapTack` matches with
 * `item.type == mapTackData.type` - a plain string comparison. A generic tack's type is
 * `DMT_BUILDING_CULTURE`, never `BUILDING_MONUMENT`, so it never matches and the pin stays on
 * the map. Concrete tacks clear because for them the two strings ARE equal.
 *
 * ⚠️ Whether that is a defect or a deliberate choice is wltk's call, not this mod's - a generic
 * pin arguably means "something of this kind belongs here" for good. This module takes the
 * other reading, that a pin is a plan and a finished plan should get out of the way, and it is
 * switchable for exactly that reason.
 *
 * This mod cannot change it in place: the host registered its handler with
 * `engine.on("ConstructibleAddedToMap", this.onConstructibleAdded, this)`, which captured the
 * function object at subscription time - replacing the method on the singleton afterwards
 * changes nothing. So this listens to the same event itself and removes what the host missed,
 * then asks the host to redraw through its own `onPlotDetailsUpdated`.
 *
 * ⚠️ Drop this module if a Detailed Map Tacks update starts clearing generic pins itself.
 */
import { loadHostModule } from '../host/detailed-map-tacks.js';
import {
    UNIQUE_QUARTER,
    isGenericTack,
    loadGenericTacks,
    standsFor,
} from '../host/generic-tacks.js';
import { onEngineEvent } from '../engine/events.js';
import { log, warn } from '../support/diagnostics.js';

let host = null;

/** Both halves of the player's unique quarter standing on this plot. */
function isUniqueQuarterComplete(x, y) {
    try {
        const wanted = host.generics.getMatchingConstructibles(UNIQUE_QUARTER);
        if (!wanted || wanted.length < 2) {
            return false;
        }
        const present = new Set(host.utils.getConstructiblesAtPlot(x, y).map((item) => item.type));
        return wanted.every((type) => present.has(type));
    } catch (error) {
        warn(`could not read the quarter on ${x},${y}: ${error}`);
        return false;
    }
}

/**
 * Does building `builtType` on this plot fulfil what the generic tack stood for?
 *
 * ⚠️ Membership itself lives in `host/generic-tacks.js`, shared with the terrain and example-list
 * changes, so all three agree on what a tack means. Only the two guards that are about CLEARING
 * rather than about meaning are here.
 *
 * ⚠️ Nothing wider than that: a cleared tack is a piece of the player's plan gone, and there is
 * no undo, so under-clearing is the survivable failure and over-clearing is not.
 */
function fulfils(genericType, builtType, x, y) {
    // ⚠️ Walls and their kin are BUILDING class but slotless - they are added to plots on their
    // own and consume no building slot, so they fulfil no plan. Without this, a wall going up
    // clears every "put a building here" tack in the city.
    if (host.utils.isSlotless(builtType)) {
        return false;
    }
    if (genericType === UNIQUE_QUARTER) {
        // ⚠️ A quarter is two buildings. Clearing the tack on the first would take the plan
        // away while it is still half done.
        return isUniqueQuarterComplete(x, y);
    }
    return standsFor(genericType, builtType);
}

function onConstructibleAdded(data) {
    const x = data?.location?.x;
    const y = data?.location?.y;
    if (typeof x !== 'number' || typeof y !== 'number') {
        return;
    }
    /*
     * ⚠️ The plot lookup comes FIRST, before anything else including the owner check. This
     * event is raised for every player, so it arrives whenever anyone anywhere finishes a
     * building; a player has a few dozen pins on a map of thousands of plots, so this is one
     * object lookup and a return for very nearly every one of them. Asking who owns the event
     * first would be more expensive, not less - a payload carrying only a location is answered
     * with a map query. The host does not filter by player here either.
     */
    let tacks;
    try {
        tacks = host.store.retrieveMapTacks(x, y);
    } catch (error) {
        warn(`could not read the map tacks on ${x},${y}: ${error}`);
        return;
    }
    if (tacks.length === 0) {
        return;
    }
    const generic = tacks.filter((tack) => isGenericTack(tack.type));
    if (generic.length === 0) {
        return;
    }

    let builtType = null;
    try {
        builtType = GameInfo.Constructibles.lookup(data.constructibleType)?.ConstructibleType;
    } catch (error) {
        warn(`could not look up the constructible that was built: ${error}`);
        return;
    }
    if (!builtType) {
        return;
    }

    const removed = [];
    for (const tack of generic) {
        if (!fulfils(tack.type, builtType, x, y)) {
            continue;
        }
        try {
            host.store.removeMapTack({ x, y, type: tack.type });
            removed.push(tack.type);
        } catch (error) {
            warn(`could not remove the ${tack.type} tack on ${x},${y}: ${error}`);
        }
    }
    if (removed.length === 0) {
        return;
    }
    /*
     * ⚠️ Always, rather than only when this ran before the host's own handler. The two
     * listeners are on the same event and nothing fixes their order, so this call is what
     * makes the pin disappear from the map instead of on the next turn. It is the host's own
     * "this plot changed" path - it revalidates the neighbours too - and it only runs on the
     * handful of events that actually removed something.
     */
    try {
        host.processor.onPlotDetailsUpdated(x, y);
    } catch (error) {
        warn(`could not ask the host to redraw ${x},${y}: ${error}`);
    }
    log(`${builtType} on ${x},${y} cleared: ${removed.join(', ')}`);
}

export function startGenericTackCleanup() {
    Promise.all([
        loadGenericTacks(),
        loadHostModule('store'),
        loadHostModule('generics'),
        loadHostModule('utils'),
        loadHostModule('changeProcessor'),
    ]).then(([ready, store, generics, utils, processor]) => {
        host = {
            store: store?.default,
            generics: generics?.default,
            utils: utils?.default,
            processor: processor?.default,
        };
        const missing = Object.entries(host).filter(([, module]) => !module).map(([name]) => name);
        if (!ready || missing.length > 0) {
            host = null;
            warn(`generic tack cleanup is off - the host did not hand over: ${missing.join(', ') || 'its generics'}`);
            return;
        }
        onEngineEvent('ConstructibleAddedToMap', onConstructibleAdded);
        log('generic tack cleanup is listening');
    });
}

