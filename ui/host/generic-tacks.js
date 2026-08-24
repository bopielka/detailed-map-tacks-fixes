/**
 * What a generic map tack actually stands for.
 *
 * The host's generic tacks (`DMT_BUILDING_CULTURE`, `DMT_WONDER`, ...) are pseudo-types: the
 * game has never heard of them, so every table keyed by `ConstructibleType` misses them. That
 * one fact is behind both of this mod's changes - the host cannot clear a tack it cannot name,
 * and cannot check terrain for a type with no rows. Answering "which real constructibles is
 * this tack a stand-in for?" once, here, is what keeps the two answers consistent.
 *
 * Host layer: it needs the host's own `MapTackGenerics`, so nothing below `host/` may use it.
 *
 * ⚠️ Memoised per age, keyed on `Game.age`. The lists are read from `GameInfo`, which is
 * stable within an age but not across one, and the answers are wanted per tack per plot
 * update - `DMT_BUILDING` alone walks every constructible in the game to build its list.
 */
import { loadHostModule } from './detailed-map-tacks.js';
import { warn } from '../support/diagnostics.js';

/** Generic tacks that mean "anything of this class" rather than a particular kind. */
const CLASS_WIDE = new Map([
    ['DMT_BUILDING', 'BUILDING'],
    ['DMT_WONDER', 'WONDER'],
    ['DMT_IMPROVEMENT', 'IMPROVEMENT'],
]);

export const UNIQUE_QUARTER = 'DMT_BUILDING_UNIQUE_QUARTER';

/**
 * The tags on a generic tack that say what it stands for. The rest of its `tags` array is
 * structural (`AGELESS`, `FULL_TILE`) and says nothing about which building fulfils it.
 */
const YIELD_TAGS = new Map([
    ['FOOD', 'YIELD_FOOD'],
    ['PRODUCTION', 'YIELD_PRODUCTION'],
    ['GOLD', 'YIELD_GOLD'],
    ['SCIENCE', 'YIELD_SCIENCE'],
    ['CULTURE', 'YIELD_CULTURE'],
    ['HAPPINESS', 'YIELD_HAPPINESS'],
    ['DIPLOMACY', 'YIELD_DIPLOMACY'],
]);

let generics = null;
let utils = null;

/** @returns true once the host modules this needs are in hand. */
export function loadGenericTacks() {
    if (generics && utils) {
        return Promise.resolve(true);
    }
    return Promise.all([loadHostModule('generics'), loadHostModule('utils')]).then(([g, u]) => {
        generics = g?.default ?? null;
        utils = u?.default ?? null;
        return Boolean(generics && utils);
    });
}

// age -> Map(genericType -> Set(constructibleType)), and the same for terrains.
let memoAge = null;
let members = null;
let terrains = null;
let shown = null;

function currentAge() {
    try {
        return Game.age;
    } catch (error) {
        return null;
    }
}

function resetMemoIfStale() {
    const age = currentAge();
    if (memoAge === age && members) {
        return;
    }
    memoAge = age;
    members = new Map();
    terrains = new Map();
    shown = new Map();
}

/**
 * ⚠️ The pseudo-types only. `BUILDING_CITY_HALL` is registered as a generic tack but IS a real
 * constructible, so every table already answers for it and nothing here should interfere.
 */
export function isGenericTack(type) {
    if (!generics) {
        return false;
    }
    try {
        return generics.isGenericMapTack(type) && !GameInfo.Constructibles.lookup(type);
    } catch (error) {
        return false;
    }
}

function buildMembers(genericType) {
    const found = new Set();
    const definition = generics.getGenericMapTack(genericType);
    if (!definition) {
        return found;
    }

    // The unique quarter names its two buildings outright; the host resolves the active civ.
    if (genericType === UNIQUE_QUARTER) {
        for (const type of generics.getMatchingConstructibles(genericType) ?? []) {
            found.add(type);
        }
        return found;
    }

    const wantedClass = CLASS_WIDE.get(genericType);
    if (wantedClass) {
        // ⚠️ Age-filtered, matching the host's own `MapTackGenerics.cacheData`. A tack is a plan
        // for THIS age; a coastal building three ages away says nothing about this plot.
        let age = null;
        try {
            age = GameInfo.Ages.lookup(Game.age)?.AgeType;
        } catch (error) {
            warn(`could not read the current age: ${error}`);
        }
        for (const row of GameInfo.Constructibles) {
            if (row.ConstructibleClass !== wantedClass) {
                continue;
            }
            if (age && row.Age && row.Age !== age) {
                continue;
            }
            found.add(row.ConstructibleType);
        }
        return found;
    }

    // A yield tack: whatever it is shown to stand for, plus the civ-uniques the tags name.
    for (const type of representativesFor(genericType)) {
        found.add(type);
    }
    // ⚠️ The game's type tags cover ONLY civ-unique buildings - 7 CULTURE and 3 SCIENCE rows in
    // the whole game. A supplement, never a basis. They are excluded from the representative
    // list above (a player who is not that civ cannot build them) but belong here, because if
    // one IS built it does fulfil the tack.
    const wantedTags = (definition.tags ?? []).filter((tag) => YIELD_TAGS.has(tag));
    if (wantedTags.length > 0) {
        for (const row of GameInfo.Constructibles) {
            if (wantedTags.some((tag) => utils.hasTag(row.ConstructibleType, tag))) {
                found.add(row.ConstructibleType);
            }
        }
    }
    return found;
}

/**
 * The buildings of THIS age that actually produce a yield, ignoring civ-uniques.
 *
 * ⚠️ Derived from `Constructible_YieldChanges`, not from adjacencies, and that is the point:
 * it is the only description of `DMT_BUILDING_DIPLOMACY` the data offers. That tack declares
 * no adjacency ids, so the host's `cacheData` never gives it a list and its tooltip prints
 * nothing at all.
 *
 * ⚠️ Age-filtered, so the answer follows the game rather than being written down: Antiquity
 * gives Monument and Villa, Exploration Dungeon and Guildhall, Modern Opera House and Radio
 * Station. ⚠️ Arena is NOT one of them - it pays Happiness and Gold, never Influence.
 *
 * ⚠️ `UNIQUE`-tagged buildings are dropped. Basilica pays +3 Influence but only Rome can build
 * it, and the host's own lists happen to contain no uniques either, so including them would
 * make this list read differently from every other tack's.
 */
function yieldDerived(genericType) {
    const found = [];
    const definition = generics.getGenericMapTack(genericType);
    const yieldType = (definition?.tags ?? []).map((tag) => YIELD_TAGS.get(tag)).find(Boolean);
    if (!yieldType) {
        return found;
    }
    let age = null;
    try {
        age = GameInfo.Ages.lookup(Game.age)?.AgeType;
    } catch (error) {
        warn(`could not read the current age: ${error}`);
        return found;
    }
    const paying = new Set();
    for (const row of GameInfo.Constructible_YieldChanges) {
        if (row.YieldType === yieldType && row.YieldChange > 0) {
            paying.add(row.ConstructibleType);
        }
    }
    for (const row of GameInfo.Constructibles) {
        if (row.ConstructibleClass !== 'BUILDING' || row.Age !== age) {
            continue;
        }
        if (!paying.has(row.ConstructibleType) || utils.hasTag(row.ConstructibleType, 'UNIQUE')) {
            continue;
        }
        found.push(row.ConstructibleType);
    }
    return found;
}

/**
 * The list a tack is SHOWN to stand for - what its tooltip prints.
 *
 * ⚠️ Not the same question as `membersOf`. A class-wide tack stands for every building in the
 * age, which is true and useless in a tooltip, so it gets an empty list here exactly as the
 * host gives it today. Only a yield tack with nothing to show falls back to the yield data.
 *
 * ⚠️ The host's own list is never widened. It is derived from `Constructible_Adjacencies` and
 * is right where it exists - Antiquity culture is Amphitheater and Monument - and replacing it
 * with "everything that pays culture" would make every list longer and vaguer.
 */
export function representativesFor(genericType) {
    if (!generics || !utils || !isGenericTack(genericType)) {
        return [];
    }
    resetMemoIfStale();
    let found = shown.get(genericType);
    if (found) {
        return found;
    }
    found = [];
    try {
        const hosts = generics.getMatchingConstructibles(genericType) ?? [];
        if (hosts.length > 0) {
            found = [...hosts];
        } else if (!CLASS_WIDE.has(genericType) && genericType !== UNIQUE_QUARTER) {
            found = yieldDerived(genericType);
        }
    } catch (error) {
        warn(`could not work out what ${genericType} is shown to stand for: ${error}`);
    }
    shown.set(genericType, found);
    return found;
}

/** Every real constructible this generic tack is a stand-in for. Empty set if it is not one. */
export function membersOf(genericType) {
    if (!generics || !utils) {
        return new Set();
    }
    resetMemoIfStale();
    let found = members.get(genericType);
    if (found) {
        return found;
    }
    try {
        found = buildMembers(genericType);
    } catch (error) {
        warn(`could not work out what ${genericType} stands for: ${error}`);
        found = new Set();
    }
    members.set(genericType, found);
    return found;
}

/** Whether `constructibleType` is one of the things this generic tack stands for. */
export function standsFor(genericType, constructibleType) {
    return membersOf(genericType).has(constructibleType);
}

/**
 * Every terrain at least one of this tack's members explicitly allows, from
 * `Constructible_ValidTerrains`.
 *
 * ⚠️ An EMPTY set does not mean "nowhere" - it means no member names a terrain, which in the
 * host's `canPlaceOnTerrain` is "unrestricted". Only the presence of a terrain here is
 * information; its absence is not.
 */
export function terrainsFor(genericType) {
    if (!generics || !utils) {
        return new Set();
    }
    resetMemoIfStale();
    let found = terrains.get(genericType);
    if (found) {
        return found;
    }
    found = new Set();
    try {
        const allowed = membersOf(genericType);
        if (allowed.size > 0) {
            for (const row of GameInfo.Constructible_ValidTerrains) {
                if (allowed.has(row.ConstructibleType)) {
                    found.add(row.TerrainType);
                }
            }
        }
    } catch (error) {
        warn(`could not work out which terrains ${genericType} allows: ${error}`);
    }
    terrains.set(genericType, found);
    return found;
}
