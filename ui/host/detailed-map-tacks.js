/**
 * Everything this mod knows about its host, "Detailed Map Tacks" (mod id
 * `detailed-map-tacks`, author wltk). One file, so that a host update breaks in one
 * place instead of in every patch.
 *
 * Why its own layer, between engine/ and patches/: nothing below this line may name the
 * host. `support/` and `engine/` are ordinary Civ VII code and stay usable if the host is
 * ever replaced; `patches/` may only reach the host through here.
 *
 * ⚠️ NEVER `import` a host module statically. A static import of a file that is not there -
 * the player disabled detailed-map-tacks, or wltk renamed it - fails at load time and takes
 * THIS WHOLE MOD down with it, entry point included. Go through `loadHostModule`, which is
 * dynamic and caught.
 *
 * ⚠️ The host's singletons are default exports of its modules (`MapTackStore`,
 * `MapTackUtils`, ...). Reaching one through `loadHostModule` gives the module the host
 * itself loaded - module identity is the resolved URL - so mutating it patches the running
 * host rather than a private copy. That only holds for the exact path spelling below; a
 * different spelling of the same file is a second module with a second singleton.
 */
import { warn } from '../support/diagnostics.js';

export const HOST_MOD_ID = 'detailed-map-tacks';

/**
 * The host's own modules, addressed the way the game addresses a mod's files.
 * ⚠️ Spelling is identity - see the header. Add to this map rather than writing a path
 * into a patch.
 */
export const HOST_MODULES = {
    store: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-store.js`,
    utils: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-utils.js`,
    uiUtils: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-ui-utils.js`,
    generics: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-generics.js`,
    validator: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-validator.js`,
    yield: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-yield.js`,
    constants: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-constants.js`,
    iconsManager: `/${HOST_MOD_ID}/ui/plot-icons/dmt-map-tack-icons-manager.js`,
};

/**
 * The components the host defines with `Controls.define`. These are the seams a patch
 * should prefer: `Controls.decorate` on one of them needs no import, cannot fail at load
 * time, and does not care whether this mod ran before or after the host - the component
 * entry is created on demand if it is not there yet.
 */
export const HOST_COMPONENTS = {
    placePanel: 'dmt-panel-place-map-tack',
    chooser: 'dmt-map-tack-chooser',
    icon: 'dmt-map-tack-icon',
};

/** The host's interface modes, by the names it registers in data/interface-modes.xml. */
export const HOST_INTERFACE_MODES = {
    chooser: 'DMT_INTERFACEMODE_MAP_TACK_CHOOSER',
    place: 'DMT_INTERFACEMODE_PLACE_MAP_TACKS',
};

/** The host's lens, as other mods address it. */
export const HOST_LENS = 'dmt-map-tack-lens';

/**
 * Is the host actually running?
 *
 * ⚠️ The .modinfo <Dependencies> entry already stops this mod applying without the host, so
 * a false here means something stranger: the host failed to load, or its scripts have not
 * run yet. Belt and braces, and cheap - `Controls.isDefined` is a map lookup.
 *
 * ⚠️ Asked at most once. It is called from patch registration, which happens at script load,
 * and the answer cannot change afterwards - scripts are loaded once per session.
 */
let present = null;

export function isHostModPresent() {
    if (present !== null) {
        return present;
    }
    present = false;
    try {
        for (const name of Object.values(HOST_COMPONENTS)) {
            if (Controls.isDefined(name)) {
                present = true;
                return present;
            }
        }
    } catch (error) {
        warn(`could not ask Controls whether ${HOST_MOD_ID} is loaded: ${error}`);
    }
    // Its components may simply not have been defined yet; the installed list is slower but
    // does not depend on load order.
    try {
        present = Modding.getInstalledMods().some((mod) => mod.id === HOST_MOD_ID);
    } catch (error) {
        warn(`could not ask Modding whether ${HOST_MOD_ID} is installed: ${error}`);
    }
    return present;
}

/**
 * One of the host's modules, or null. @param key a key of `HOST_MODULES`.
 *
 * ⚠️ Async, and that is not incidental: this is the only safe way to touch host code, so a
 * patch that needs the store is an async patch. Cached per key, including the failure - a
 * module that is not there will not be there on the next try either.
 */
const loaded = new Map();

export function loadHostModule(key) {
    if (loaded.has(key)) {
        return loaded.get(key);
    }
    const path = HOST_MODULES[key];
    if (!path) {
        warn(`no host module is registered under "${key}"`);
        const missing = Promise.resolve(null);
        loaded.set(key, missing);
        return missing;
    }
    const pending = import(path).catch((error) => {
        warn(`could not load ${path} from ${HOST_MOD_ID}: ${error}`);
        return null;
    });
    loaded.set(key, pending);
    return pending;
}
