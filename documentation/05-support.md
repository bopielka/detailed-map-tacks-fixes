# 05 — `ui/support/`

The bottom layer. These modules import nothing of this mod's own except each other, know
nothing about the game and nothing about the host, so anything may use them.

## `diagnostics.js`

```js
export const DIAGNOSTICS = false;
export function log(...args)   // gated on DIAGNOSTICS
export function warn(...args)  // always writes
```

⚠️ **`console.log` never reaches `Logs/UI.log`.** Everything in this engine goes through
`console.error`, which is why both helpers do.

⚠️ **Every line is tagged `[najane-map-tacks]`.** The tag matters more in this mod than in a
stand-alone one: `UI.log` also carries lines written by the host, and "the map tacks are
wrong" is a bug report that could belong to either mod. The tag is what tells them apart.

Choosing between them: `warn` for anything a player might have to report or that explains
silence — a missing host, a fix that failed to start, the build stamp. `log` for everything
else. ⚠️ **Set `DIAGNOSTICS = false` before publishing.**

## `dom.js`

`clearChildren`, `appendAll`, `ensureStyle`, `makeElement`.

⚠️ **This DOM has no `replaceChildren`** — calling it throws, which is the whole reason
`clearChildren` exists. `appendAll` skips falsy children deliberately, so a builder that
returns `null` when a thing is switched off does not need a guard at every call site.

⚠️ When this mod first hangs a tooltip on something, port `setTooltip` from the sibling mods
rather than writing `data-tooltip-content` at the call site. One door is what makes a "hide
this mod's tooltips" option possible later without visiting a dozen files — and in those mods
that lesson cost a dozen call sites across ten files.

⚠️ CSS lives in template literals, so **a backtick inside one — including inside a `/* */`
comment — closes the string** and the module fails to load, taking the whole mod with it. Use
quotes in CSS comments. `deploy.sh` checks for this by name.

## `build-stamp.js`

One constant, written by `deploy.sh` at deploy time and printed on load.

⚠️ **Generated, never edited, and not in git** (see `.gitignore`) — but the entry point
imports it, so a deploy that does not write it ships a mod that fails to load. The source-tree
copy says `not deployed`, which is exactly what a run from source should say.

The reason it exists: the game loads scripts **once**, at startup or on returning to the main
menu. Deploying while a session is running changes the files on disk and nothing else. There is
no sign of this from inside the game.
