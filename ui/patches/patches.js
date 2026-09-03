/**
 * The one place a change is registered, and the only thing the entry point calls.
 *
 * A change is one file in this folder exporting one `startX()`. It is listed below, and
 * nothing else imports it - so everything this mod does to the host can be read off this file
 * alone, which is the question a report about it actually asks.
 *
 * ⚠️ The master switch and the host check are answered HERE, once, not inside each change. One
 * that has to remember to ask is one that will forget.
 *
 * ⚠️ Registration runs at script load. `Controls.decorate` is safe there whatever the load
 * order (see host/detailed-map-tacks.js); anything that reads the game is not - there may be
 * no game yet. A change that needs one waits for its own engine event or component lifecycle.
 */
import { isHostModPresent, HOST_MOD_ID } from '../host/detailed-map-tacks.js';
import { startGenericTackCleanup } from './generic-tack-cleanup.js';
import { startRightClickRemove } from './right-click-remove.js';
import { startGenericTackTerrain } from './generic-tack-terrain.js';
import { startGenericTackRepresentatives } from './generic-tack-representatives.js';
import { startHotkeyTogglesPanel } from './hotkey-toggles-panel.js';
import { areChangesEnabled } from '../engine/changes-setting.js';
import { log, warn } from '../support/diagnostics.js';

/**
 * Every change, in registration order. `{ name, start }` - the name is what the log prints, so
 * make it the behaviour it changes, not the file.
 */
const CHANGES = [
    { name: 'clear generic tacks once what they stand for is built', start: startGenericTackCleanup },
    { name: 'delete a tack from the map with right-click', start: startRightClickRemove },
    { name: 'let a generic tack sit on water and mountain where its members can', start: startGenericTackTerrain },
    { name: 'give the Influence tack the example buildings it has none of', start: startGenericTackRepresentatives },
    { name: 'close the map tack panel with the same hotkey that opens it', start: startHotkeyTogglesPanel },
];

export function startPatches() {
    if (!isHostModPresent()) {
        // ⚠️ `warn`, not `log`. The .modinfo dependency should have made this impossible, so
        // reaching it means the host failed to load - and that is the whole explanation for
        // "this mod does nothing", which nobody can see from inside the game.
        warn(`${HOST_MOD_ID} is not loaded - nothing applied`);
        return;
    }
    if (!areChangesEnabled()) {
        log('this mod\'s changes are switched off in the options');
        return;
    }
    if (CHANGES.length === 0) {
        log('nothing is registered yet');
        return;
    }
    for (const change of CHANGES) {
        try {
            change.start();
        } catch (error) {
            // One broken change must not take the rest with it.
            warn(`"${change.name}" failed to start: ${error}`);
        }
    }
    log(`applied ${CHANGES.length}: ${CHANGES.map((change) => change.name).join(', ')}`);
}
