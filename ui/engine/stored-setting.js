/**
 * A setting the player changes, remembered between sessions. Callers keep the option name, the
 * default and what the value MEANS; the plumbing is here.
 *
 * ⚠️ THE OFFSET IS THE WHOLE REASON THIS IS NOT A ONE-LINER, and it has bitten this mod twice.
 * `UI.getOption` answers 0 for an option that was never set, which is indistinguishable from one
 * deliberately set to 0 - harmless while every default is "off", fatal the moment a default is
 * "on" or 0 is a legitimate choice (the happiness dropdown's "Never"). So nothing here stores a
 * raw value: a switch stores 1 for off and 2 for on, a choice its index plus one.
 *
 * ⚠️ Written to BOTH `UI.setOption` and `saveCheckpoint()`. Without the checkpoint the value is
 * remembered for the session and forgotten on exit, which reads as a switch that does not stick.
 *
 * ⚠️ `window.dispatchEvent` from engine/ is a deliberate exception to the layer rule: a setting has
 * to be able to announce itself to whatever is drawing it.
 */
import { log, warn } from '../support/diagnostics.js';

/** Never touched. Not a value; the absence of one. */
const UNSET = 0;
const STORED_OFF = 1;
const STORED_ON = 2;

/** Choices are stored one higher than their value, so that 0 stays free to mean UNSET. */
const CHOICE_OFFSET = 1;

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

function announce(changedEventName) {
    if (!changedEventName) {
        return;
    }
    try {
        window.dispatchEvent(new CustomEvent(changedEventName));
    } catch (error) {
        warn(`could not announce ${changedEventName}: ${error}`);
    }
}

/**
 * An on/off setting. @returns `{ isOn(), set(value) }` - the value is read from the game once, on
 * the first question asked, because the callers ask on every planning pass.
 */
export function storedSwitch({ option, defaultValue = true, label, changedEventName = null }) {
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
            announce(changedEventName);
            log(`${label}: ${value ? 'on' : 'off'}`);
        },
    };
}

/** A setting with more than two states. @returns `{ get(), set(value) }`. */
export function storedChoice({ option, values, defaultValue, label, changedEventName = null, describe = null }) {
    let value = null;

    return {
        get() {
            if (value === null) {
                const stored = readRaw(option, label) - CHOICE_OFFSET;
                value = values.includes(stored) ? stored : defaultValue;
            }
            return value;
        },
        set(next) {
            const chosen = Number(next);
            value = values.includes(chosen) ? chosen : defaultValue;
            writeRaw(option, label, value + CHOICE_OFFSET);
            announce(changedEventName);
            log(`${label}: ${describe ? describe(value) : value}`);
        },
    };
}
