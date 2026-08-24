# 11 — Development workflow

## Deploying

**The game never reads this repository.** It reads a copy in its own mod folder, so a change
that has not been deployed is a change that is not running.

```bash
./deploy.sh
```

```bash
./deploy.sh --dry
```

```bash
CIV7_MODS_DIR="/path/to/Mods" ./deploy.sh
```

One script for both platforms; it branches on `uname`. `deploy-on-mac.sh` is a two-line shim,
kept because it is what gets typed. Default targets:

- **macOS** — `~/Library/Application Support/Civilization VII/Mods/`
- **Windows** — `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Mods\`

⚠️ **The `.modinfo` filename and the `<Mod id>` are deliberately different**, and `deploy.sh`
carries them as two variables for that reason. The file is
`detailed-map-tacks-tweaks-by-najane.modinfo`; the id — and therefore the deployed folder — is
still `detailed-map-tacks-fixes-by-najane`. The id namespaces the player's stored options and
names the folder already in the Mods directory, so renaming it would silently reset every toggle
and leave the old folder behind as a second, older copy that still loads. The game does not
require the two to match: 17 of the 50 Workshop mods installed on this machine differ, and they
all load. **Do not "tidy" them back together.**

It wipes and rebuilds the target — the repository is the source of truth and the mod folder is
build output, so a file deleted here disappears there instead of lingering. Only the `.modinfo`
and the content directories are copied; `README`, `.git` and notes stay out by construction.

Then it: parses every script, refuses on a stray backtick in a style block, checks both BBCode
files against their Steam limits, writes `ui/support/build-stamp.js`, and verifies that every
file the `.modinfo` names actually exists in the target.

⚠️ **After deploying, return to the main menu or restart.** Scripts are loaded once.

⚠️ **Both mods must be enabled** in the Mods menu — this one and Detailed Map Tacks. With the
host disabled, the game will not apply this mod at all; that is the dependency working.

## ⚠️ `node --check` is worthless on these files

It parses `.js` as CommonJS, meets `import`, gives up, and **exits 0 on a file with a syntax
error**. Every "syntax ok" reported that way means nothing. Reading from stdin with
`--input-type=module` is what actually parses them:

```bash
for f in $(find ui -name '*.js'); do node --input-type=module --check < "$f" || echo "FAIL $f"; done
```

`deploy.sh` runs exactly this, which is the reason to deploy rather than hand-check — checking
a file by hand and then editing it once more is the other half of that failure.

## Reading the logs

macOS: `~/Library/Application Support/Civilization VII/Logs/`
Windows: `%LOCALAPPDATA%\Firaxis Games\Sid Meier's Civilization VII\Logs\`

| File | Answers |
|---|---|
| `UI.log` | This mod's output and every JS error |
| `Modding.log` | Was this mod loaded — **and was the host** |
| `Database.log` | Did the XML validate |

⚠️ **`console.log` never reaches `UI.log`.** Use `log()` / `warn()` from
`ui/support/diagnostics.js`. Lines are tagged `[najane-map-tacks]`; the host's are not.

The first three things to check when the mod "does nothing":

1. `UI.log` for `[najane-map-tacks] loaded, build …` — is the deployed build the running one?
2. The same line's neighbourhood for `detailed-map-tacks is not loaded`.
3. `Modding.log` for both mod ids in the enabled list.

⚠️ A Steam Workshop copy of a mod with the same id **shadows a local deploy, silently**. If a
deployed change appears to do nothing at all, check that first.

## Publishing

1. `DIAGNOSTICS = false` in `ui/support/diagnostics.js`.
2. `CHANGELOG.md` **and** `STEAM_CHANGELOG.bbcode`, in the same pass — the first carries the
   cause and reasoning, the second one bullet per change. Every change entry names **what the host
   does wrong**, not only what this mod now does.
3. `<Properties><Version>` in the `.modinfo`. ⚠️ Leave `version` on `<Mod>` an integer ≥ 1: it
   is parsed as an int, so `version="0.1"` lands in `Mods.sqlite` as `0` and the game silently
   refuses to apply the mod — discovered, shown as enabled, never in the enabled list.
4. `./deploy.sh` and play it.

⚠️ `STEAM_CHANGELOG.bbcode` has a hard **8000**-character limit and `steam-description.bbcode`
a **6000**-character one. Steam truncates silently, losing the tail — which is where the
credits and the source link live. `deploy.sh` refuses rather than let that happen. When the
changelog is close, **drop the oldest version section** rather than trimming recent ones.

## Conventions

4-space indent, semicolons, single quotes, trailing commas. `camelCase` functions,
`SCREAMING_SNAKE` module constants, `najane-map-tacks-*` CSS classes and style ids. Imports of
game files are absolute (`/core/…`, `/base-standard/…`), of this mod's files relative, of the
host's **never static**.

Every module opens with a block comment saying what it is for **and why it lives in that
layer**. That is how the layer rule stays enforceable by reading.

⚠️ Wrap every call into the game in `try`/`catch` and `warn` on failure — the engine throws
where a browser would return `undefined`. The same goes double for calls into the host.

## The comment budget

Comments here are for an agent opening the repository cold. A comment earns its place by
carrying something the code cannot say: a constraint, a measurement, a platform trap, a fact
about the host, or the reason a layer boundary sits where it does.

- **Say the fact, not the history.**
- **Never restate the code.**
- A module header is three to eight lines for an ordinary module.
- Prefer one `⚠️` line over a `⚠️` paragraph. If it needs a paragraph, it belongs in
  `documentation/`, with the comment pointing at it.

⚠️ This is about **density, not about deleting knowledge**. Compress a long note to the
constraint it protects; do not throw the constraint away with the prose.

⚠️ **A comment inside a template literal is not a comment — it is DATA.**
