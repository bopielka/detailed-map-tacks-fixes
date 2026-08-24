#!/usr/bin/env bash
#
# Deploys "Detailed Map Tacks Fixes by Najane" into Civilization VII's mod folder.
#
# One script for both platforms; it branches on `uname` for the install path.
# `deploy-on-mac.sh` is a two-line shim that runs this. Keeping the logic in one
# file is deliberate: the sibling mods kept two copies "in sync" and did not,
# and the copy that drifted was the one missing the STEAM_CHANGELOG size check.
#
# This repository is the source of truth; the game folder is treated as build
# output and rebuilt from scratch on every run, so files deleted here also
# disappear there instead of lingering as stale leftovers.
#
# Only what the game actually loads is copied - the .modinfo and the content
# directories listed below. Everything else (this script, README, .git, notes)
# stays out of the player's mod folder by construction, not by an exclude list
# that can drift.
#
# Usage:  ./deploy.sh          deploy
#         ./deploy.sh --dry    show what would happen, change nothing
#
# Override the install location if needed:
#         CIV7_MODS_DIR="/path/to/Mods" ./deploy.sh
#
set -euo pipefail

# --- configure ---------------------------------------------------------------
MOD_ID="detailed-map-tacks-fixes-by-najane"

# Directories copied into the game, relative to this script.
CONTENT_DIRS=(ui text config)

# Default install path, per platform. Windows (Git Bash) puts the Mods folder
# under %LOCALAPPDATA%; macOS puts it under ~/Library/Application Support.
# Override with CIV7_MODS_DIR rather than editing this.
case "$(uname -s)" in
    Darwin)
        DEFAULT_MODS_DIR="$HOME/Library/Application Support/Civilization VII/Mods"
        ;;
    *)
        DEFAULT_MODS_DIR="${LOCALAPPDATA:-$HOME/AppData/Local}/Firaxis Games/Sid Meier's Civilization VII/Mods"
        ;;
esac
# -----------------------------------------------------------------------------

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_ROOT="${CIV7_MODS_DIR:-$DEFAULT_MODS_DIR}"
DEST_DIR="$DEST_ROOT/$MOD_ID"

DRY_RUN=0
[[ "${1:-}" == "--dry" ]] && DRY_RUN=1

say() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Double-clicked in Explorer, this runs in a git-bash.exe window that closes the instant
# the script ends - so a `die` on line 90 looked exactly like "nothing happened". Hold the
# window open in that case only: git-bash.exe starts an interactive shell ($- contains i),
# while `./deploy-on-mac.sh` from a terminal or from another script does not.
if [[ $- == *i* ]]; then
    trap 'printf "\nPress Enter to close... "; read -r' EXIT
fi

# --- safety: never let a bad path turn this into a destructive command --------
[[ -f "$SRC_DIR/$MOD_ID.modinfo" ]] \
    || die "$MOD_ID.modinfo not found in $SRC_DIR - run this from the mod's own folder."
[[ "$(basename "$DEST_DIR")" == "$MOD_ID" ]] \
    || die "refusing to touch '$DEST_DIR' - it does not end in $MOD_ID."
[[ -d "$DEST_ROOT" ]] \
    || die "Civ VII mods folder not found: $DEST_ROOT (set CIV7_MODS_DIR to override)"

say "source: $SRC_DIR"
say "target: $DEST_DIR"
say ""

if [[ $DRY_RUN -eq 1 ]]; then
    say "[dry run] would remove the target folder and copy:"
    # `find` fails on content dirs this mod does not ship yet - not an error here.
    ( cd "$SRC_DIR" && find "$MOD_ID.modinfo" "${CONTENT_DIRS[@]}" -type f 2>/dev/null | sort | sed 's/^/  /' ) || true
    say ""
    say "[dry run] nothing was changed."
    exit 0
fi

# --- check: every script must parse -------------------------------------------
#
# ⚠️ `node --check <file>.js` DOES NOT CHECK THESE FILES. It parses a .js file as
# CommonJS, and every file here is an ES module; faced with `import` it gives up and
# exits 0. Verified against a file with a deliberate line break inside a string literal:
#
#     node --check ui/screen/tab-icons.js                  -> exit 0   (says nothing)
#     node --input-type=module --check < .../tab-icons.js  -> exit 1   (points at line 23)
#
# Reading from stdin with --input-type=module is what actually parses them. Every
# "syntax ok" this project reported before that was worthless, which is how a broken
# string literal reached the game and stopped the mod loading entirely.
#
# It runs here rather than by hand because by hand is the other half of that failure: a
# file was checked, edited once more, and deployed unchecked.
#
# ⚠️ `node` is resolved with `type -P`, NOT called by name. Double-clicking this script in
# Explorer runs it through git-bash.exe, which starts an INTERACTIVE login shell, and Git
# for Windows defines `alias node='winpty node.exe'` in interactive shells. winpty refuses
# to run with redirected stdin/stdout - it prints "stdin is not a tty" and exits 1 - so
# every check below failed, `die` aborted the run, and the window closed before anyone
# could read it. From a terminal the same script worked, because aliases are only defined
# in interactive shells. `type -P` ignores aliases and functions and returns the real .exe.
NODE_BIN="$(type -P node || true)"
if [[ -n "$NODE_BIN" ]]; then
    broken=0
    while IFS= read -r file; do
        "$NODE_BIN" --input-type=module --check < "$SRC_DIR/$file" >/dev/null 2>&1 || {
            printf 'SYNTAX ERROR: %s\n' "$file" >&2
            "$NODE_BIN" --input-type=module --check < "$SRC_DIR/$file" 2>&1 | sed -n '1,4p' >&2
            broken=$((broken + 1))
        }
    done < <(cd "$SRC_DIR" && find ui -name '*.js' -type f | sort)
    [[ $broken -eq 0 ]] || die "$broken file(s) do not parse - the mod would not load."
else
    say "note: node not found, skipping the syntax check"
fi

# --- check: a backtick inside a style block ends the string early -------------
#
# The CSS in this mod lives in template literals, and a backtick written inside one -
# quoting a property name in a comment, say - closes it. What follows is then parsed as
# code and the module fails to load, taking the whole mod with it.
#
# The parser above does catch this - it reports the same "SyntaxError: Unexpected
# identifier" the game does. This check is kept because it names the actual mistake
# instead of pointing at whatever line the wreckage first stops parsing on, and because
# it still works if node is missing. (An earlier note here claimed Node could not catch
# it at all; that was wrong - the check simply was not parsing these files.)
stray=0
while IFS= read -r hit; do
    printf 'BACKTICK INSIDE A STYLE BLOCK: %s\n' "$hit" >&2
    stray=$((stray + 1))
done < <(
    cd "$SRC_DIR" && find ui -name '*.js' -type f 2>/dev/null | sort | while IFS= read -r file; do
        awk -v f="$file" '
            /^const [A-Za-z_]+ = `$/ { inside = 1; next }
            inside && /^`;$/         { inside = 0; next }
            inside && /`/            { printf "%s:%d  %s\n", f, NR, $0 }
        ' "$file"
    done
)
[[ $stray -eq 0 ]] || die "$stray stray backtick(s) - the mod would fail to load. Use quotes in CSS comments."

# --- check: the Steam description has a hard 6000-character limit -------------
#
# Steam truncates the Workshop description field at 6000 characters. It does not warn -
# the tail is simply gone, and the first thing lost is whatever sits at the bottom, which
# is where the credits and the source link live.
#
# Checked here rather than trusted to memory: the description grows a line at a time as
# features land, and nobody counts characters while writing one.
DESCRIPTION="$SRC_DIR/steam-description.bbcode"
DESCRIPTION_LIMIT=6000
if [[ -f "$DESCRIPTION" ]]; then
    size=$(wc -c < "$DESCRIPTION" | tr -d '[:space:]')
    if [[ "$size" -gt "$DESCRIPTION_LIMIT" ]]; then
        die "steam-description.bbcode is $size characters; Steam allows $DESCRIPTION_LIMIT. Trim it."
    fi
    say "steam description: $size/$DESCRIPTION_LIMIT characters"
fi

# The Workshop's change-note field is a separate, larger box. Same failure mode though: it
# truncates silently, and this file grows by a section every release rather than a line.
CHANGES="$SRC_DIR/STEAM_CHANGELOG.bbcode"
CHANGES_LIMIT=8000
if [[ -f "$CHANGES" ]]; then
    size=$(wc -c < "$CHANGES" | tr -d '[:space:]')
    if [[ "$size" -gt "$CHANGES_LIMIT" ]]; then
        die "STEAM_CHANGELOG.bbcode is $size characters; Steam allows $CHANGES_LIMIT. Drop the oldest section."
    fi
    say "steam changelog: $size/$CHANGES_LIMIT characters"
fi

# --- deploy ------------------------------------------------------------------
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"

cp "$SRC_DIR/$MOD_ID.modinfo" "$DEST_DIR/"
for dir in "${CONTENT_DIRS[@]}"; do
    [[ -d "$SRC_DIR/$dir" ]] && cp -r "$SRC_DIR/$dir" "$DEST_DIR/"
done

# --- stamp the build ----------------------------------------------------------
#
# The game loads the mod's scripts ONCE, at startup or on returning to the main menu.
# Deploying while a session is running changes the files on disk and nothing else - the
# game keeps running the build it loaded. There is no sign of this from inside the game,
# and it has already cost a full round of debugging a fix that was on disk and not running.
#
# So every deploy writes its own timestamp, and the mod prints it on load. One line in
# Logs/UI.log then answers "is the running game actually running this build?".
#
# Generated, never edited by hand, and not in git - see .gitignore. That last part is why
# this block cannot be skipped on either platform: ui/detailed-map-tacks-fixes.js imports
# this file, so a deploy that does not write it ships a mod that fails to load.
BUILD_STAMP=$(date '+%Y-%m-%d %H:%M:%S')
cat > "$DEST_DIR/ui/support/build-stamp.js" <<EOF
/** Generated at deploy time. Not the source of truth for anything. */
export const BUILD_STAMP = '$BUILD_STAMP';
EOF
# The source tree needs the file too, or the import fails when running from source.
[[ -f "$SRC_DIR/ui/support/build-stamp.js" ]] || cat > "$SRC_DIR/ui/support/build-stamp.js" <<EOF
/** Generated at deploy time. Not the source of truth for anything. */
export const BUILD_STAMP = 'not deployed';
EOF

# --- verify: every file the .modinfo references must exist in the target ------
missing=0
while IFS= read -r item; do
    [[ -z "$item" ]] && continue
    if [[ ! -f "$DEST_DIR/$item" ]]; then
        printf 'MISSING: %s (referenced by .modinfo)\n' "$item" >&2
        missing=$((missing + 1))
    fi
done < <(grep -o '<\(Item\|File\)[^>]*>[^<]*</\(Item\|File\)>' "$DEST_DIR/$MOD_ID.modinfo" \
         | sed 's/<[^>]*>//g')

count=$(find "$DEST_DIR" -type f | wc -l)
say "deployed $count files"
if [[ $missing -gt 0 ]]; then
    die "$missing file(s) referenced by the .modinfo are missing - the mod will not load correctly."
fi
say "all .modinfo references resolved"
say ""
say "Restart the game, or return to the main menu, to reload the mod."
