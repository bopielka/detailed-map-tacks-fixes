/**
 * The generic Influence tack lists no example buildings, although the game has them.
 *
 * ⚠️ WHAT THE HOST DOES TODAY. `MapTackGenerics.cacheData` builds each generic tack's example
 * list from `Constructible_Adjacencies`, and only "if (genericMapTack.adjacencyIds.length > 0)".
 * `DMT_BUILDING_DIPLOMACY` is declared with `adjacencyIds: []`, so it never gets a list, and
 * `getTooltipString` returns undefined for it - the tooltip simply has no examples where every
 * other tack shows some. Production shows Barracks and Blacksmith; Influence shows nothing.
 *
 * The list is filled here from `Constructible_YieldChanges` instead, which is the only
 * description of an influence building the data offers. ⚠️ Per age, computed rather than
 * written down: Antiquity gives Monument and Villa, Exploration Dungeon and Guildhall, Modern
 * Opera House and Radio Station.
 *
 * ⚠️ Arena is NOT an influence building - it pays Happiness and Gold. Basilica does pay +3
 * Influence but is `UNIQUE`-tagged and only Rome can build it, so it is left out of the shown
 * list for the same reason the host's other lists contain no uniques. Both are in
 * `host/generic-tacks.js`, with the data behind them.
 *
 * ⚠️ AN EXISTING LIST IS NEVER WIDENED, and a class-wide tack still gets none. The host's
 * adjacency-derived lists are right where they exist - Antiquity culture is Amphitheater and
 * Monument - and "everything that pays culture" would be longer and vaguer. `DMT_BUILDING`
 * stands for every building in the age, which is true and useless in a tooltip.
 */
import { loadGenericTacks, representativesFor } from '../host/generic-tacks.js';
import { loadHostModule } from '../host/detailed-map-tacks.js';
import { log, warn } from '../support/diagnostics.js';

export function startGenericTackRepresentatives() {
    Promise.all([loadGenericTacks(), loadHostModule('generics')]).then(([ready, module]) => {
        const generics = module?.default;
        if (!ready || !generics) {
            warn('generic tack examples are off - the host did not hand over its generics');
            return;
        }
        const original = generics.getMatchingConstructibles;
        if (typeof original !== 'function') {
            warn('generic tack examples are off - getMatchingConstructibles is not where it used to be');
            return;
        }
        /*
         * ⚠️ Patched at the LIST, not at `getTooltipString`, so everything reading it agrees:
         * the tooltip, and `MapTackUtils.getMapTackTypePlots`, which uses the same list to find
         * which plots you planned a given building on.
         */
        generics.getMatchingConstructibles = (type) => {
            let hosts = [];
            try {
                hosts = original.call(generics, type) ?? [];
            } catch (error) {
                warn(`the host could not list what ${type} stands for: ${error}`);
                return [];
            }
            if (hosts.length > 0) {
                return hosts;
            }
            const derived = representativesFor(type);
            return derived.length > 0 ? [...derived] : hosts;
        };
        log('generic tacks with no examples now derive them from yields');
    });
}
