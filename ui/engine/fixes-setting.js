/**
 * The master switch: whether this mod's patches are applied at all.
 *
 * It exists because of what this mod is. A fixes pack sits on top of somebody else's mod, and
 * when the host updates, a patch can go from fixing a bug to being the bug. One switch lets a
 * player rule this mod out of a problem without unsubscribing from it, which is the difference
 * between a useful report and "I removed everything and it went away".
 *
 * ⚠️ Read ONCE, by `startPatches()` at script load, so it takes effect on the next load. That
 * is honest for what it decides - whether patches are registered at all - and a registered
 * decorator cannot be un-registered. Contrast right-click-remove-setting.js, which is read per
 * click and applies at once.
 *
 * Lives in engine/ rather than options/ because ⚠️ `ui/options/` also loads in SHELL scope,
 * where there is no game: the options module may import no further down than this, and this
 * module must do nothing at import time beyond building a closure.
 */
import { storedSwitch } from './stored-setting.js';

const fixesEnabled = storedSwitch({
    option: 'detailed-map-tacks-fixes-by-najane.fixesEnabled',
    defaultValue: true,
    label: 'map tack fixes',
});

export function areFixesEnabled() {
    return fixesEnabled.isOn();
}

export function setFixesEnabled(value) {
    fixesEnabled.set(value);
}
