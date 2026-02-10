import { wireSortMenuController } from '../../src/app/workspaces/app-toolkit/ui/controllers/sortMenuController.js';
import { wireFetchPresetsController } from '../../src/app/workspaces/app-toolkit/ui/controllers/fetchPresetsController.js';
import { wireDashboardUpdatesController } from '../../src/app/workspaces/app-toolkit/ui/controllers/dashboardUpdatesController.js';

/**
 * Change Rationale:
 * - Controller extraction needs DOM-level behavior checks so route composition can stay thin.
 */

describe('App Toolkit controllers integration', () => {
  test('sort menu controller toggles and emits selected sort key', () => {
    document.body.innerHTML = `
      <button id="sortButton"></button>
      <div id="sortMenu">
        <button data-sort-key="name"></button>
      </div>
    `;
    const sortButton = document.getElementById('sortButton');
    const sortMenu = document.getElementById('sortMenu');
    sortMenu.open = false;

    const selections = [];
    wireSortMenuController({ sortButton, sortMenu, onSelect: (key) => selections.push(key) });

    sortButton.click();
    expect(sortMenu.open).toBe(true);
    sortMenu.querySelector('[data-sort-key="name"]').click();
    expect(selections).toEqual(['name']);
  });

  test('fetch presets controller forwards selected preset URL', () => {
    document.body.innerHTML = '<button id="preset" data-app-toolkit-preset=" ./api/app_toolkit/v2/debug/en/home/api_android_apps.json "></button>';
    const preset = document.getElementById('preset');
    const calls = [];
    wireFetchPresetsController({
      presetButtons: [preset],
      trimString: (value) => String(value || '').trim(),
      fetchRemoteJson: (url, options) => calls.push({ url, options })
    });

    preset.click();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('./api/app_toolkit/v2/debug/en/home/api_android_apps.json');
    expect(calls[0].options.fromPreset).toBe(true);
  });

  test('dashboard updates controller reacts to filter interactions', () => {
    document.body.innerHTML = '<div id="chips"></div>';
    const chips = document.getElementById('chips');
    const calls = [];

    wireDashboardUpdatesController({ filterChipSet: chips, onFiltersChanged: () => calls.push('changed') });

    chips.dispatchEvent(new Event('change'));
    chips.dispatchEvent(new Event('click'));

    expect(calls).toEqual(['changed', 'changed']);
  });
});
