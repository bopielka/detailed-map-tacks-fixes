/**
 * The one place a fix is registered, and the only thing the entry point calls.
 *
 * A fix is one file in this folder exporting one `startX()`. It is listed below, and
 * nothing else imports it - so what this mod does to the host can be read off this file
 * alone, which is the question a bug report actually asks.
 *
 * ⚠️ The master switch and the host check are answered HERE, once, not inside each fix. A
 * fix that has to remember to ask is a fix that will forget.
 *
 * ⚠️ Registration runs at script load. `Controls.decorate` is safe there whatever the load
 * order (see host/detailed-map-tacks.js); anything that reads the game is not - there may be
 * no game yet. A fix that needs one waits for its own engine event or component lifecycle.
 */
import { isHostModPresent, HOST_MOD_ID } from '../host/detailed-map-tacks.js';
import { startGenericTackCleanup } from './generic-tack-cleanup.js';
import { startRightClickRemove } from './right-click-remove.js';
import { areFixesEnabled } from '../engine/fixes-setting.js';
import { log, warn } from '../support/diagnostics.js';

/**
 * Every fix, in registration order. `{ name, start }` - the name is what the log says when
 * the list is printed, so make it the bug, not the file.
 */
const FIXES = [
    { name: 'generic tacks are never cleared when what they stand for is built', start: startGenericTackCleanup },
    { name: 'no way to delete a tack from the map outside the chooser', start: startRightClickRemove },
];

export function startPatches() {
    if (!isHostModPresent()) {
        // ⚠️ `warn`, not `log`. The .modinfo dependency should have made this impossible, so
        // reaching it means the host failed to load - and that is the whole explanation for
        // "the fixes mod does nothing", which nobody can see from inside the game.
        warn(`${HOST_MOD_ID} is not loaded - no fixes applied`);
        return;
    }
    if (!areFixesEnabled()) {
        log('fixes are switched off in the options');
        return;
    }
    if (FIXES.length === 0) {
        log('no fixes are registered yet');
        return;
    }
    for (const fix of FIXES) {
        try {
            fix.start();
        } catch (error) {
            // One broken fix must not take the rest of the pack with it.
            warn(`the "${fix.name}" fix failed to start: ${error}`);
        }
    }
    log(`applied ${FIXES.length} fix(es): ${FIXES.map((fix) => fix.name).join(', ')}`);
}
