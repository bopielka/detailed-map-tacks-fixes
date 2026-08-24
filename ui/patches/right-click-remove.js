/**
 * Right-click a map tack on the map to delete it.
 *
 * ⚠️ WHAT THE HOST DOES TODAY, in its own words. `MapTackIcons.mapTackClickListener` deletes a
 * tack on left-click ONLY while the chooser interface mode is open, and its `else` branch reads
 * `// TODO: Come up with a better quicker deletion solution.` Outside the chooser there is no
 * way to remove a tack from the map at all. This is the missing half wltk left a note for, not
 * a defect - which is why it is an option rather than a correction.
 *
 * ⚠️ THE HOOK IS `engine-input` ON THE COMPONENT, NOT A DOM MOUSE EVENT AND NOT A WINDOW
 * LISTENER. `ContextManager.handleInput` dispatches the event to `Cursor.target` - the element
 * under the mouse - and bails out of the whole chain the moment `defaultPrevented` is set:
 *
 *     if (this.shouldSendEventToCursor(inputEvent) && Cursor.target instanceof HTMLElement) {
 *         Cursor.target.dispatchEvent(inputEvent);
 *         if (inputEvent.defaultPrevented) { return false; }
 *     }
 *     ...
 *     return !this.engineInputEventHandlers.some((handler) => !handler.handleInput(inputEvent));
 *
 * `world-input` is one of those `engineInputEventHandlers`, and it is reached last. So calling
 * `preventDefault()` here is not a race with a capture listener - it is the documented way a
 * component takes an input away from the world.
 *
 * ⚠️ THAT SUPPRESSION IS NOT OPTIONAL. `WorldInput.actionMouseRightButton` never checks
 * `Cursor.isOnUI`: it goes straight to `doActionOnPlot`. Without the `preventDefault` below,
 * deleting a tack would also order the selected unit to walk to that plot.
 */
import { HOST_COMPONENTS } from '../host/detailed-map-tacks.js';
import { isRightClickRemoveEnabled } from '../engine/right-click-remove-setting.js';
import { log, warn } from '../support/diagnostics.js';

const RIGHT_CLICK = 'mousebutton-right';
const ENGINE_INPUT = 'engine-input';
const TACK_CONTAINER = '.map-tack-icon-container';

class NajaneRightClickRemoveDecorator {
    constructor(component) {
        this.component = component;
        this.onEngineInput = this.handleEngineInput.bind(this);
    }

    beforeAttach() {}

    afterAttach() {
        // Bubbles up from whichever icon the cursor is actually on; see the header.
        this.component.Root?.addEventListener(ENGINE_INPUT, this.onEngineInput);
    }

    beforeDetach() {
        this.component.Root?.removeEventListener(ENGINE_INPUT, this.onEngineInput);
    }

    afterDetach() {}

    /**
     * Which tack the cursor is on.
     *
     * ⚠️ By POSITION, because the host hangs no identity on the icons it builds.
     * `MapTackIcons.updateData` appends exactly one child per entry of `mapTackList`, in
     * order, so the index of the container's child is the index of the tack. If the host ever
     * appends anything else into that container, this silently deletes the wrong tack - check
     * `createItem` before assuming it still holds.
     */
    findMapTack(target) {
        const container = this.component.Root?.querySelector(TACK_CONTAINER);
        if (!container || !target || !container.contains(target)) {
            return null;
        }
        let node = target;
        // Terminates: `contains` above guarantees the container is on the way up.
        while (node.parentElement !== container) {
            node = node.parentElement;
        }
        const index = Array.prototype.indexOf.call(container.children, node);
        if (index < 0) {
            return null;
        }
        const mapTackList = this.component.mapTackList;
        return index < mapTackList.length ? mapTackList[index] : null;
    }

    handleEngineInput(event) {
        if (event.detail?.name !== RIGHT_CLICK || !isRightClickRemoveEnabled()) {
            return;
        }
        const status = event.detail?.status;
        if (status !== InputActionStatuses.START && status !== InputActionStatuses.FINISH) {
            return;
        }
        let mapTack = null;
        try {
            mapTack = this.findMapTack(event.target);
        } catch (error) {
            warn(`could not tell which map tack was right-clicked: ${error}`);
            return;
        }
        if (!mapTack) {
            // Not on a tack - right-click keeps its normal meaning.
            return;
        }
        /*
         * ⚠️ START is swallowed and does nothing else. `actionMouseRightButton` draws the
         * selected unit's destination path on START and only clears it on FINISH, so letting
         * START through would leave a movement arrow stranded on the map.
         */
        if (status === InputActionStatuses.FINISH) {
            try {
                // The host's own removal path: it updates the store, redraws the plot and
                // raises CityCenterMapTackUpdated where that matters.
                engine.trigger('RemoveMapTackRequest', mapTack);
                log(`right-click removed ${mapTack.type} on ${mapTack.x},${mapTack.y}`);
            } catch (error) {
                warn(`could not remove ${mapTack.type}: ${error}`);
                return;
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }
}

export function startRightClickRemove() {
    /*
     * ⚠️ Registered whatever the setting says, and the setting is read per click instead. The
     * decorator can only be attached at script load, so deciding here would mean the option
     * did nothing until the game was restarted.
     */
    Controls.decorate(HOST_COMPONENTS.icons, (component) => new NajaneRightClickRemoveDecorator(component));
}
