/**
 * The master switch: whether this mod's patches are applied at all.
 *
 * It exists because of what this mod is. A fixes pack sits on top of somebody else's mod,
 * and when the host updates, a patch can go from fixing a bug to being the bug. One switch
 * lets a player rule this mod out of a problem without unsubscribing from it, which is the
 * difference between a useful report and "I removed everything and it went away".
 *
 * Lives in engine/ rather than options/ because ⚠️ `ui/options/` also loads in SHELL scope,
 * where there is no game: the options module may import no further down than this, and this
 * module must do nothing at import time beyond building a closure. `storedSwitch` reads the
 * stored value lazily, on the first question asked.
 */
import { storedSwitch } from './stored-setting.js';

export const FixesSettingChangedEventName = 'najane-map-tacks-fixes-changed';

/**
 * ⚠️ Defaults to ON, which is exactly why the value cannot be stored raw: `UI.getOption`
 * answers 0 for an option nobody ever set, indistinguishable from a deliberate "off".
 * `storedSwitch` handles that; see its header.
 */
const fixesEnabled = storedSwitch({
    option: 'detailed-map-tacks-fixes-by-najane.fixesEnabled',
    defaultValue: true,
    label: 'map tack fixes',
    changedEventName: FixesSettingChangedEventName,
});

export function areFixesEnabled() {
    return fixesEnabled.isOn();
}

export function setFixesEnabled(value) {
    fixesEnabled.set(value);
}
