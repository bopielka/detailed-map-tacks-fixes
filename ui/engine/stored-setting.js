/**
 * A setting the player changes, remembered between sessions. Callers keep the option name, the
 * default and what the value MEANS; the plumbing is here.
 *
 * ⚠️ THE OFFSET IS THE WHOLE REASON THIS IS NOT A ONE-LINER. `UI.getOption` answers 0 for an
 * option that was never set, which is indistinguishable from one deliberately set to 0 -
 * harmless while every default is "off", fatal the moment a default is "on", which both of
 * this mod's settings are. So nothing here stores a raw value: a switch stores 1 for off and 2
 * for on, leaving 0 to mean "never touched".
 *
 * ⚠️ Written to BOTH `UI.setOption` and `saveCheckpoint()`. Without the checkpoint the value is
 * remembered for the session and forgotten on exit, which reads as a switch that does not stick.
 */
import { log, warn } from '../support/diagnostics.js';

/** Never touched. Not a value; the absence of one. */
const UNSET = 0;
const STORED_OFF = 1;
const STORED_ON = 2;

function readRaw(option, label) {
    try {
        return Number(UI.getOption('user', 'Mod', option));
    } catch (error) {
        warn(`could not read the ${label} setting: ${error}`);
        return UNSET;
    }
}

function writeRaw(option, label, stored) {
    try {
        UI.setOption('user', 'Mod', option, stored);
        Configuration.getUser().saveCheckpoint();
    } catch (error) {
        warn(`could not save the ${label} setting: ${error}`);
    }
}

/**
 * An on/off setting. @returns `{ isOn(), set(value) }` - the value is read from the game once,
 * on the first question asked, because a caller may ask on every click.
 */
export function storedSwitch({ option, defaultValue = true, label }) {
    let value = null;

    return {
        isOn() {
            if (value === null) {
                const stored = readRaw(option, label);
                value = stored === STORED_OFF || stored === STORED_ON ? stored === STORED_ON : defaultValue;
            }
            return value;
        },
        set(next) {
            value = !!next;
            writeRaw(option, label, value ? STORED_ON : STORED_OFF);
            log(`${label}: ${value ? 'on' : 'off'}`);
        },
    };
}
