/**
 * A generic tack is reported invalid on coast and navigable river, although buildings that
 * belong there exist.
 *
 * ⚠️ WHAT THE HOST DOES TODAY. `MapTackValidator.isValid` ends with a terrain gate:
 *
 *     if (!this.waterPlacement && (terrain == "TERRAIN_COAST" || terrain == "TERRAIN_NAVIGABLE_RIVER"))
 *         -> invalid
 *     else if (!this.mountainPlacement && terrain == "TERRAIN_MOUNTAIN")
 *         -> invalid
 *
 * `waterPlacement` is only ever set from a real `ConstructibleType`: a `Constructible_ValidTerrains`
 * row in `canPlaceOnTerrain`, a `RiverPlacement` on `GameInfo.Constructibles.lookup(type)`, or a
 * wonder's `AdjacentToLand`. A generic tack is a pseudo-type the game has never heard of, so
 * every one of those lookups comes back empty, the flag stays false and the gate refuses it.
 *
 * ⚠️ The data says otherwise: 12 BUILDING-class constructibles carry a water `ValidTerrains` row
 * (Lighthouse, Port, Wharf, Shipyard, Fishing Quay, Harbor, the three bridges, walls on coast),
 * plus 3 wonders and 2 improvements - and Machu Picchu is valid on TERRAIN_MOUNTAIN.
 *
 * ⚠️ THE SEAM IS `canPlaceOnTerrain`, NOT `isValid`. `isValid` sets `this.waterPlacement = false`
 * on entry and reads it at the end, so there is no way in from outside; `canPlaceOnTerrain` is
 * where the host itself raises the flag, is called as `this.canPlaceOnTerrain(...)`, and so can
 * be replaced on the singleton. Wrapping `isValid` instead would mean guessing from a list of
 * localised reason strings which check failed.
 *
 * ⚠️ This answers "could something of this kind stand here", not "is every requirement met".
 * A Lighthouse also needs `OFF_COAST`, which a generic tack cannot promise - but a tack is a
 * plan, and the alternative on the table is a flat "no" on every water tile.
 */
import { isGenericTack, loadGenericTacks, terrainsFor } from '../host/generic-tacks.js';
import { loadHostModule } from '../host/detailed-map-tacks.js';
import { log, warn } from '../support/diagnostics.js';

const WATER_TERRAINS = new Set(['TERRAIN_COAST', 'TERRAIN_NAVIGABLE_RIVER']);
const MOUNTAIN_TERRAIN = 'TERRAIN_MOUNTAIN';

export function startGenericTackTerrain() {
    Promise.all([loadGenericTacks(), loadHostModule('validator')]).then(([ready, module]) => {
        const validator = module?.default;
        if (!ready || !validator) {
            warn('generic tack terrain is off - the host did not hand over its validator');
            return;
        }
        const original = validator.canPlaceOnTerrain;
        if (typeof original !== 'function') {
            warn('generic tack terrain is off - canPlaceOnTerrain is not where it used to be');
            return;
        }
        validator.canPlaceOnTerrain = (type, terrainType) => {
            // ⚠️ Only ever ADDS a yes. Anything this does not recognise goes to the original
            // untouched, so no concrete constructible changes behaviour.
            if (isGenericTack(type) && terrainsFor(type).has(terrainType)) {
                if (WATER_TERRAINS.has(terrainType)) {
                    validator.waterPlacement = true;
                    return true;
                }
                if (terrainType === MOUNTAIN_TERRAIN) {
                    validator.mountainPlacement = true;
                    return true;
                }
            }
            return original.call(validator, type, terrainType);
        };
        log('generic tacks may now sit on water and mountain where their members can');
    });
}
