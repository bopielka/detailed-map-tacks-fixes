# 10 — `text/`

Twelve locales, two files each.

| File | Loaded by | Holds |
|---|---|---|
| `ModInfoText.xml` | `<LocalizedText>` in the `.modinfo` | The mod's name and description, as shown in the Mods menu |
| `InGameText.xml` | `<UpdateText>` in **both** ActionGroups | Everything the mod puts on screen |

```
de_DE  en_us  es_ES  fr_FR  it_IT  ja_JP  ko_KR  pl_PL  pt_BR  ru_RU  zh_Hans_CN  zh_Hant_HK
```

## ⚠️ A new key goes into all twelve

A key that exists in `en_us` alone shows up as the raw `LOC_` tag for everybody else. There is
no fallback.

## ⚠️ `text/ru_RU/` holds UKRAINIAN

Deliberate, and not a mislabelled file: the game ships no Ukrainian locale, so `ru_RU` is the
only slot those strings can occupy. Anyone playing in Russian gets Ukrainian text from this
mod. **Do not "fix" this by translating the file into Russian.** If a Ukrainian locale is ever
added, move the file to it verbatim and give `ru_RU` its own text. The note is repeated at the
top of both files and beside every reference to them in the `.modinfo`.

## ⚠️ `<EnglishText>` only in `en_us`

Every other locale uses `<LocalizedText>` with an explicit `Language` attribute. An
`<EnglishText>` block in, say, `text/pl_PL/` is inserted as `en_US` regardless of the folder
name, and collides:

```
ERROR: Database: UNIQUE constraint failed: LocalizedText.ModRowId, Tag, Locale
```

`Database.log` is where that appears.

## Key naming

| Prefix | For |
|---|---|
| `LOC_MOD_NAJANE_MAP_TACKS_*` | The mod's own name and description |
| `LOC_OPTIONS_NAJANE_MAP_TACKS_*` | Options screen labels and descriptions |
| `LOC_NAJANE_MAP_TACKS_*` | Everything else this mod draws |

The mod **name** is deliberately left in English in every locale, matching the sibling mods:
it is how the mod is found on the Workshop.

⚠️ Nothing user-visible is written into the JavaScript. A new language needs only a copy of
the two files.

## Formatting inside `<Text>`

`[N]` is a line break. Game text tags (`[ICON_…]`, style tags) work here too. The host's own
strings are its business — do not re-declare a `LOC_` key that belongs to Detailed Map Tacks;
that is a database collision, not an override.
