/**
 * Whether right-clicking a map tack on the map deletes it.
 *
 * Same layer and same reason as [fixes-setting.js]: ⚠️ `ui/options/` also loads in SHELL
 * scope, so the options module may import no further down than here, and nothing here may
 * touch the game at import time. `storedSwitch` builds a closure and reads lazily.
 */
import { storedSwitch } from './stored-setting.js';

export const RightClickRemoveSettingChangedEventName = 'najane-map-tacks-right-click-changed';

/** ⚠️ Defaults to ON, which is why the value cannot be stored raw - see `storedSwitch`. */
const rightClickRemove = storedSwitch({
    option: 'detailed-map-tacks-fixes-by-najane.rightClickRemove',
    defaultValue: true,
    label: 'remove map tacks with right-click',
    changedEventName: RightClickRemoveSettingChangedEventName,
});

export function isRightClickRemoveEnabled() {
    return rightClickRemove.isOn();
}

export function setRightClickRemoveEnabled(value) {
    rightClickRemove.set(value);
}
