import '/core/ui/options/screen-options.js'; // must load before the model is touched
import { CategoryType, Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';

/*
 * ⚠️ This file loads in SHELL scope as well as in game - the options screen exists in the
 * main menu, where there is no game, no engine events and no host mod. So the only imports
 * of this mod's own code allowed here are near-leaves that do nothing at import time:
 * `fixes-setting.js` builds a closure and stops, and reads the stored value on the first
 * question asked. Importing anything from host/ or patches/ here would drag the host's
 * absence into the main menu.
 */
import { areFixesEnabled, setFixesEnabled } from '../engine/fixes-setting.js';

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

/** This mod's own heading inside the shared "Mods" tab. */
const OPTION_GROUP = 'najane_map_tacks';

// ⚠️ Order matters: a group is laid out in the order its options are added.
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: OPTION_GROUP,
        type: OptionType.Checkbox,
        id: 'najane-map-tacks-fixes-enabled',
        initListener: (info) => (info.currentValue = areFixesEnabled()),
        updateListener: (_info, value) => setFixesEnabled(value),
        label: 'LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED',
        description: 'LOC_OPTIONS_NAJANE_MAP_TACKS_ENABLED_DESCRIPTION',
    });
});
