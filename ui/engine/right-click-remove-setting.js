/**
 * Whether right-clicking a map tack on the map deletes it.
 *
 * ⚠️ Read PER CLICK, inside the handler, so it applies at once. The decorator behind it is
 * registered whatever this says - deciding at registration time would leave the option doing
 * nothing until the game was restarted.
 *
 * Same layer and same reason as fixes-setting.js: ⚠️ `ui/options/` also loads in SHELL scope,
 * so the options module may import no further down than here, and nothing here may touch the
 * game at import time.
 */
import { storedSwitch } from './stored-setting.js';

const rightClickRemove = storedSwitch({
    option: 'detailed-map-tacks-fixes-by-najane.rightClickRemove',
    defaultValue: true,
    label: 'remove map tacks with right-click',
});

export function isRightClickRemoveEnabled() {
    return rightClickRemove.isOn();
}

export function setRightClickRemoveEnabled(value) {
    rightClickRemove.set(value);
}
