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
silence — a missing host, a change that failed to start, the build stamp. `log` for everything
else. ⚠️ **Set `DIAGNOSTICS = false` before publishing.**

## There is no `dom.js`

⚠️ Deliberately. Both sibling mods have one; this mod draws nothing of its own — its two changes
work through the host's data and the host's own components — so a DOM helper module here would
be four functions nobody calls. When a change first builds an element, port what it needs from
`../better-commerce-screen-ui/ui/support/dom.js`, which carries the facts that matter:
`replaceChildren` throws in this DOM, `appendChild` is the reliable append, and
`data-tooltip-content` must go through one door so a "hide tooltips" option stays possible.

⚠️ CSS in these mods lives in template literals, so **a backtick inside one — including inside
a `/* */` comment — closes the string** and the module fails to load, taking the whole mod with
it. Use quotes in CSS comments. `deploy.sh` checks for this by name, and will keep checking
whether or not this mod has any CSS yet.

## `build-stamp.js`

One constant, written by `deploy.sh` at deploy time and printed on load.

⚠️ **Generated, never edited, and not in git** (see `.gitignore`) — but the entry point
imports it, so a deploy that does not write it ships a mod that fails to load. The source-tree
copy says `not deployed`, which is exactly what a run from source should say.

The reason it exists: the game loads scripts **once**, at startup or on returning to the main
menu. Deploying while a session is running changes the files on disk and nothing else. There is
no sign of this from inside the game.
