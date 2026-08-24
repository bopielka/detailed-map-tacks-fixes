/**
 * The master switch: whether this mod's changes are applied at all.
 *
 * It exists because of what this mod is. An add-on sits on top of somebody else's mod, and a
 * change that improves the host today can be the thing in the way after the host updates. One
 * switch lets a player rule this mod out of a problem without unsubscribing from it, which is
 * the difference between a useful report and "I removed everything and it went away".
 *
 * ⚠️ Read ONCE, by `startPatches()` at script load, so it takes effect on the next load. That
 * is honest for what it decides - whether the changes are registered at all - and a registered
 * decorator cannot be un-registered. Contrast right-click-remove-setting.js, which is read per
 * click and applies at once.
 *
 * Lives in engine/ rather than options/ because ⚠️ `ui/options/` also loads in SHELL scope,
 * where there is no game: the options module may import no further down than this, and this
 * module must do nothing at import time beyond building a closure.
 */
import { storedSwitch } from './stored-setting.js';

/**
 * ⚠️ The stored key keeps its original `fixesEnabled` spelling on purpose. It is persisted in
 * the player's options; renaming it to match this module would silently reset the toggle for
 * anyone who had already set it. The name a value is stored under is not documentation.
 */
const changesEnabled = storedSwitch({
    option: 'detailed-map-tacks-fixes-by-najane.fixesEnabled',
    defaultValue: true,
    label: 'map tack changes',
});

export function areChangesEnabled() {
    return changesEnabled.isOn();
}

export function setChangesEnabled(value) {
    changesEnabled.set(value);
}
