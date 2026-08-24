# 01 — What the mod does

## In one line

It patches **Detailed Map Tacks** by wltk. It adds no features of its own.

## The fixes it ships

| Fix | What the host does wrong | Module |
|---|---|---|
| — | — | — |

**None yet.** This version is the scaffolding. Every fix added later gets a row here, a
`{ name, start }` entry in `ui/patches/patches.js`, and an entry in `CHANGELOG.md` that names
the host bug rather than only the remedy — that is the note that decides whether the patch can
be dropped after a host update.

## What the player sees today

One option, under **Options → Mods → Detailed Map Tacks Fixes by Najane**:

| Option | Key | Default | Meaning |
|---|---|---|---|
| Apply Detailed Map Tacks fixes | `LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED` | on | Skips the whole patch list. See [options](09-options-and-persistence.md). |

And one line in `UI.log` on load, naming the build that is actually running:

```
[najane-map-tacks] loaded, build 2026-08-24 16:04:11
```

⚠️ That line is `warn`, not `log`, so it appears with `DIAGNOSTICS = false`. It is the answer
to "is the running game running the build I just deployed?", which nothing inside the game
will tell you — scripts are loaded once.

## What it deliberately does not do

- **It does not replace any host file.** Forking a host file freezes the fix at today's host
  version and silently reverts whatever wltk changes next.
- **It does not work without the host.** That is enforced by the `.modinfo`, not by intent;
  see [Architecture](02-architecture.md).
