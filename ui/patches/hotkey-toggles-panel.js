/**
 * The hotkey that opens the map tack menu closes it again.
 *
 * ⚠️ WHAT THE HOST DOES TODAY. `ui/input/dmt-hotkey-manager.js` wraps
 * `HotkeyManager.handleInput` and answers `open-map-tack-panel` (F2 by default) with
 * `sendHotkeyEvent(name)`; the mini-map decorator hears the resulting
 * `hotkey-open-map-tack-panel` window event and calls
 * `InterfaceMode.switchTo("DMT_INTERFACEMODE_MAP_TACK_CHOOSER")`. There is no close path on
 * that key, and pressing it again does not even reach a listener: core's `sendHotkeyEvent`
 * dispatches only `if (InterfaceMode.allowsHotKeys())`, which is FALSE for a handler that
 * declares no `allowsHotKeys` - and neither of the host's two map tack modes declares one. So
 * with the menu open the key is inert, and only Escape gets out.
 *
 * *Why change it:* a key that opens a panel is expected to close it, and every other panel
 * hotkey in this game behaves that way.
 *
 * ⚠️ THE FIX CANNOT BE `allowsHotKeys`. Granting it on the host's mode handler would open the
 * gate for EVERY hotkey - open-techs, open-civics, quick-load - while the tack menu is up.
 * The close has to be decided inside `handleInput`, before the host's wrapper swallows the
 * action.
 *
 * ⚠️ WE MUST BE THE OUTER WRAPPER. The host's wrapper returns false for this action without
 * calling on, so a wrapper installed underneath it never sees the key. `<LoadOrder>2000</...>`
 * puts this script after `dmt-hotkey-manager.js`, and both wrap from `engine.whenReady.then`,
 * so ours is queued second and lands outside. Nothing else here depends on load order; this
 * does.
 *
 * ⚠️ Cost: one string comparison per input event that reaches `HotkeyManager` - which is last
 * in the chain and only sees what nothing else consumed. `InterfaceMode.getCurrent()` is read
 * for this one action only. Input events are per keystroke, not per frame.
 */
import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { HOST_INPUT_ACTIONS, isMapTackModeActive } from '../host/detailed-map-tacks.js';
import { log, warn } from '../support/diagnostics.js';

export function startHotkeyTogglesPanel() {
    engine.whenReady.then(() => {
        const previousHandleInput = HotkeyManager.handleInput;

        HotkeyManager.handleInput = function (...args) {
            const [inputEvent] = args;
            const detail = inputEvent?.detail;
            if (detail?.status === InputActionStatuses.FINISH
                && detail.name === HOST_INPUT_ACTIONS.openPanel
                && isMapTackModeActive()) {
                try {
                    /*
                     * ⚠️ The same exit the host uses for Escape - its chooser hides itself on
                     * InterfaceModeChanged, and its placement mode tears its overlays down in
                     * `transitionFrom`. Do not try to close the panel directly.
                     *
                     * ⚠️ From the placement mode this leaves the map tack UI altogether rather
                     * than stepping back to the chooser: Escape is what steps back, and a
                     * toggle key that only half-closes is not a toggle.
                     */
                    InterfaceMode.switchToDefault();
                    log('closed the map tack panel with its own hotkey');
                } catch (error) {
                    warn(`could not close the map tack panel: ${error}`);
                }
                return false;
            }
            return previousHandleInput.apply(this, args);
        };
    });
}
