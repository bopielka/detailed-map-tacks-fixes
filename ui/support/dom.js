/**
 * The DOM helpers, and the platform's answers to "why did that not work".
 *
 * Bottom layer with support/diagnostics.js: imports nothing of this mod's, knows nothing
 * about the game or about detailed-map-tacks, so anything may use it.
 *
 * ⚠️ When this mod starts hanging tooltips on things, port `setTooltip` from the sibling
 * mods rather than writing `data-tooltip-content` at the call site - one door is what makes
 * a "hide this mod's tooltips" option possible later without visiting a dozen files.
 */

/** ⚠️ This DOM has no `replaceChildren` - calling it throws. Empty containers by hand. */
export function clearChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/** ⚠️ Only the older `appendChild` can be relied on here. A falsy child is SKIPPED. */
export function appendAll(parent, ...children) {
    for (const child of children) {
        if (!child) {
            continue;
        }
        parent.appendChild(child);
    }
    return parent;
}

/** Puts a stylesheet in the document once, under an id, and hands the element back. */
export function ensureStyle(id, css) {
    const existing = document.getElementById(id);
    if (existing) {
        return existing;
    }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

export function makeElement(tag, className, attributes = {}) {
    const element = document.createElement(tag);
    element.className = className;
    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }
    return element;
}
