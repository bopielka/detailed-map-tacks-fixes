/**
 * Generic map tacks are never cleared when the thing they stand for gets built.
 *
 * ⚠️ THE HOST BUG, exactly. `MapTackChangeProcessor.onConstructibleAdded` builds
 * `{ x, y, type: <the constructible that was built> }` and hands it to
 * `MapTackStore.removeMapTack`, whose `getIndexOfMapTack` matches with
 * `item.type == mapTackData.type` - a plain string comparison. A generic tack's type is
 * `DMT_BUILDING_CULTURE`, never `BUILDING_MONUMENT`, so it can never match and the pin
 * stays on the map forever. Concrete tacks work because for them the two strings ARE equal.
 *
 * This mod cannot fix that in place: the host registered its handler with
 * `engine.on("ConstructibleAddedToMap", this.onConstructibleAdded, this)`, which captured the
 * function object at subscription time - replacing the method on the singleton afterwards
 * changes nothing. So this listens to the same event itself and removes what the host missed,
 * then asks the host to redraw through its own `onPlotDetailsUpdated`.
 *
 * ⚠️ Drop this patch if a Detailed Map Tacks update starts clearing generic pins itself.
 */
import { loadHostModule } from '../host/detailed-map-tacks.js';
import { onEngineEvents, stopEngineEvents } from '../engine/events.js';
import { log, warn } from '../support/diagnostics.js';

/**
 * The tags on a generic tack that say what it stands for. The rest of its `tags` array is
 * structural (`AGELESS`, `FULL_TILE`) and says nothing about which building fulfils it.
 */
const YIELD_TAGS = new Set(['FOOD', 'PRODUCTION', 'GOLD', 'SCIENCE', 'CULTURE', 'HAPPINESS', 'DIPLOMACY']);

/** Generic tacks that mean "anything of this class", rather than a particular kind. */
const CLASS_WIDE = new Set(['DMT_BUILDING', 'DMT_WONDER', 'DMT_IMPROVEMENT']);

const UNIQUE_QUARTER = 'DMT_BUILDING_UNIQUE_QUARTER';

let host = null;
let handles = null;

/**
 * ⚠️ Built on the first event, not at load: it reads `GameInfo`, and the host fills the data
 * behind `getGenericMapTacks()` on `engine.whenReady`. By the time a constructible is added
 * there is certainly a game.
 */
let pseudoTypes = null;

function getPseudoTypes() {
    if (pseudoTypes) {
        return pseudoTypes;
    }
    pseudoTypes = new Set();
    try {
        for (const generic of host.generics.getGenericMapTacks()) {
            // ⚠️ `BUILDING_CITY_HALL` is registered as a generic tack but IS a real
            // constructible type, so the host's own string match already removes it. Only the
            // types the game has never heard of are this patch's business.
            if (!GameInfo.Constructibles.lookup(generic.type)) {
                pseudoTypes.add(generic.type);
            }
        }
    } catch (error) {
        warn(`could not list the host's generic tack types: ${error}`);
    }
    return pseudoTypes;
}

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
 * Does building `builtType` on this plot fulfil what the generic tack promised?
 *
 * Three signals, in order of how strongly the host itself commits to them. ⚠️ Nothing wider
 * than these: a removed pin is a piece of the player's plan gone, and there is no undo, so
 * under-removing is the survivable failure and over-removing is not.
 */
function fulfils(genericType, builtType, builtClass, x, y) {
    const definition = host.generics.getGenericMapTack(genericType);
    if (!definition) {
        return false;
    }
    // ⚠️ Walls and their kin are BUILDING class but slotless - they are added to plots on
    // their own and consume no building slot, so they fulfil no plan. Without this, a wall
    // going up wipes every "put a building here" pin in the city.
    if (host.utils.isSlotless(builtType)) {
        return false;
    }
    if (genericType === UNIQUE_QUARTER) {
        // ⚠️ A quarter is two buildings. Clearing the pin on the first one would take the
        // plan away while it is still half done.
        return isUniqueQuarterComplete(x, y);
    }
    if (definition.classType !== builtClass) {
        return false;
    }
    if (CLASS_WIDE.has(genericType)) {
        return true;
    }
    // 1. The host's own list - and the one the player was shown: `getTooltipString` prints
    //    exactly this on the pin. It is derived from `Constructible_Adjacencies`, and in
    //    practice it is the right answer: DMT_BUILDING_CULTURE in Antiquity is
    //    {Amphitheater, Monument}.
    if (host.generics.getMatchingConstructibles(genericType)?.includes(builtType)) {
        return true;
    }
    // 2. The game's own type tags. ⚠️ These cover ONLY unique buildings - `GameInfo.TypeTags`
    //    has 7 CULTURE and 3 SCIENCE rows in the whole game, all of them civ uniques like
    //    Mastaba or Madrasa - so this is a supplement to the list above, never a replacement
    //    for it. It is also the only signal DMT_BUILDING_DIPLOMACY has at all, that one
    //    having no adjacencies and therefore an empty host list.
    return definition.tags?.some((tag) => YIELD_TAGS.has(tag) && host.utils.hasTag(builtType, tag)) ?? false;
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
    const pseudo = getPseudoTypes();
    const generic = tacks.filter((tack) => pseudo.has(tack.type));
    if (generic.length === 0) {
        return;
    }

    let builtType = null;
    let builtClass = null;
    try {
        const definition = GameInfo.Constructibles.lookup(data.constructibleType);
        builtType = definition?.ConstructibleType;
        builtClass = definition?.ConstructibleClass;
    } catch (error) {
        warn(`could not look up the constructible that was built: ${error}`);
        return;
    }
    if (!builtType) {
        return;
    }

    const removed = [];
    for (const tack of generic) {
        if (!fulfils(tack.type, builtType, builtClass, x, y)) {
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
        loadHostModule('store'),
        loadHostModule('generics'),
        loadHostModule('utils'),
        loadHostModule('changeProcessor'),
    ]).then(([store, generics, utils, processor]) => {
        host = {
            store: store?.default,
            generics: generics?.default,
            utils: utils?.default,
            processor: processor?.default,
        };
        const missing = Object.entries(host).filter(([, module]) => !module).map(([name]) => name);
        if (missing.length > 0) {
            host = null;
            warn(`generic tack cleanup is off - the host did not give up: ${missing.join(', ')}`);
            return;
        }
        handles = onEngineEvents(['ConstructibleAddedToMap'], onConstructibleAdded, { localPlayerOnly: false });
        log('generic tack cleanup is listening');
    });
}

/** Not called yet; the mod has no path that stops a fix. Here so the handle is not orphaned. */
export function stopGenericTackCleanup() {
    stopEngineEvents(handles);
    handles = null;
}
