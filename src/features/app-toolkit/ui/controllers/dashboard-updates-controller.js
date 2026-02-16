/**
 * @file UI controller for App Toolkit dashboard/filter refresh triggers.
 */

/**
 * Wires chip-set changes so dashboard and card filters stay synchronized.
 *
 * @param {{filterChipSet: HTMLElement | null, onFiltersChanged: () => void}} deps Controller dependencies.
 * @returns {void}
 */
export function wireDashboardUpdatesController({ filterChipSet, onFiltersChanged }) {
  if (!filterChipSet) return;
  filterChipSet.addEventListener('change', () => onFiltersChanged());
  filterChipSet.addEventListener('click', () => onFiltersChanged());
}
