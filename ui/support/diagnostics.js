/**
 * ⚠️ `console.log` never reaches Logs\UI.log in this engine; everything goes through
 * `console.error`. DIAGNOSTICS ships false - `warn` still writes, `log` does not.
 *
 * ⚠️ The tag matters more here than in a stand-alone mod: the log will also carry lines
 * from detailed-map-tacks itself, and "the map tacks are wrong" is a bug report that could
 * belong to either. Every line this mod writes says which mod wrote it.
 */
export const DIAGNOSTICS = false;

export function log(...args) {
    if (DIAGNOSTICS) {
        console.error('[najane-map-tacks]', ...args);
    }
}

export function warn(...args) {
    console.error('[najane-map-tacks]', ...args);
}
