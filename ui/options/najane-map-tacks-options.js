import '/core/ui/options/screen-options.js'; // must load before the model is touched
import { CategoryType, Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';

/*
 * ⚠️ This file loads in SHELL scope as well as in game - the options screen exists in the
 * main menu, where there is no game, no engine events and no host mod. So the only imports
 * of this mod's own code allowed here are near-leaves that do nothing at import time:
 * `changes-setting.js` builds a closure and stops, and reads the stored value on the first
 * question asked. Importing anything from host/ or patches/ here would drag the host's
 * absence into the main menu.
 */
import { areChangesEnabled, setChangesEnabled } from '../engine/changes-setting.js';
import {
    isRightClickRemoveEnabled,
    setRightClickRemoveEnabled,
} from '../engine/right-click-remove-setting.js';

/**
 * ⚠️ The "Mods" category is not part of the base game, so it is created with `??=` under the
 * shared id "mods" - several community mods then share one tab instead of each spawning its
 * own. Najane's other mods do the same and land in the same tab by construction.
 */
CategoryType['Mods'] = 'mods';
CategoryData[CategoryType.Mods] ??= {
    title: 'LOC_UI_CONTENT_MGR_SUBTITLE',
    description: 'LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION',
};

/**
 * The heading these options sit under, inside the shared "Mods" tab.
 *
 * ⚠️ The heading TEXT is the host's name, "Detailed Map Tacks" - not this mod's - so a player
 * looking for map tack settings finds one section rather than two. The host itself adds
 * nothing to this screen (its only stored setting, the placement preview radius, is changed
 * from inside its own placement mode), so there is no group to genuinely share; the label is
 * what does the merging. Attribution stays visible in the option labels themselves.
 *
 * ⚠️ The game derives the heading's key from this id: `najane_map_tacks` ->
 * `LOC_OPTIONS_GROUP_NAJANE_MAP_TACKS`. Rename the id and the heading silently falls back to
 * printing the raw key on screen, which is exactly what shipped in the first build.
 */
const OPTION_GROUP = 'najane_map_tacks';

// ⚠️ Order matters: a group is laid out in the order its options are added.
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: OPTION_GROUP,
        type: OptionType.Checkbox,
        id: 'najane-map-tacks-changes-enabled',
        initListener: (info) => (info.currentValue = areChangesEnabled()),
        updateListener: (_info, value) => setChangesEnabled(value),
        label: 'LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED',
        description: 'LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED_DESCRIPTION',
    });

    Options.addOption({
        category: CategoryType.Mods,
        group: OPTION_GROUP,
        type: OptionType.Checkbox,
        id: 'najane-map-tacks-right-click-remove',
        initListener: (info) => (info.currentValue = isRightClickRemoveEnabled()),
        updateListener: (_info, value) => setRightClickRemoveEnabled(value),
        label: 'LOC_OPTIONS_NAJANE_MAP_TACKS_RIGHT_CLICK',
        description: 'LOC_OPTIONS_NAJANE_MAP_TACKS_RIGHT_CLICK_DESCRIPTION',
    });
});
