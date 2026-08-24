/**
 * Detailed Map Tacks Fixes by Najane - entry point.
 *
 * An add-on to "Detailed Map Tacks" by wltk. It has no screen and no features of its own:
 * everything it does is a patch to the host mod, and every patch is registered in
 * patches/patches.js.
 *
 * The .modinfo lists only this file and the options module; everything else arrives by
 * import, which is also what fixes the order (a module always runs before the module
 * importing it).
 */
import { startPatches } from './patches/patches.js';
import { BUILD_STAMP } from './support/build-stamp.js';
import { DIAGNOSTICS, log, warn } from './support/diagnostics.js';
import { logEventStats, onEngineEvent } from './engine/events.js';

startPatches();

// ⚠️ Diagnostics only, and the first measurement to take when the report is "the game runs
// slowly". Nothing is counted and this listener is not installed with diagnostics off.
if (DIAGNOSTICS) {
    onEngineEvent('LocalPlayerTurnBegin', logEventStats);
}

/*
 * ⚠️ `warn`, not `log`, and it carries the build stamp. Scripts load ONCE, so a deploy made
 * mid-session changes the files and nothing else - a fix can be deployed and simply not be
 * running, with no sign of it from inside the game. This line names the running build.
 */
warn(`loaded, build ${BUILD_STAMP}`);
log('diagnostics are on');
