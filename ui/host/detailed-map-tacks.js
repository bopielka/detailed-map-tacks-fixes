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
 * ⚠️ Spelling is identity - see the header. Add a key here rather than writing a path into a
 * patch. The host has more modules than these four (validator, yield, ui-utils, constants,
 * icons-manager); they are listed in documentation/04-the-host-mod.md and belong here only
 * once something actually loads one.
 */
const HOST_MODULES = {
    store: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-store.js`,
    utils: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-utils.js`,
    generics: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-generics.js`,
    changeProcessor: `/${HOST_MOD_ID}/ui/map-tack-core/dmt-map-tack-change-processor.js`,
};

/**
 * The components the host defines with `Controls.define`. These are the seams a patch should
 * prefer: `Controls.decorate` on one of them needs no import, cannot fail at load time, and
 * does not care whether this mod ran before or after the host - the component entry is created
 * on demand if it is not there yet.
 *
 * ⚠️ Plural. `MAP_TACK_ELEMENT_NAME` in the host is "dmt-map-tack-icons" - one component per
 * PLOT, holding every tack on it, not one per tack. The host's other two components
 * (dmt-panel-place-map-tack, dmt-map-tack-chooser) are in documentation/04-the-host-mod.md.
 */
export const HOST_COMPONENTS = {
    icons: 'dmt-map-tack-icons',
};

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
