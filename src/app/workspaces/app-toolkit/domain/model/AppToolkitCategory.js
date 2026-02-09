/**
 * @file Canonical Google Play category model for App Toolkit entries.
 */

/**
 * Change Rationale:
 * - Category labels were previously embedded in `AppToolkitRoute.js`, mixing domain constants
 *   with UI wiring concerns.
 * - Moving the catalog into a domain model keeps route modules focused on composition while
 *   preserving one canonical source of truth for category metadata.
 * - This separation improves maintainability and aligns with Material 3 predictability guidance
 *   by ensuring category selectors render stable, normalized options.
 */

/**
 * Supported Google Play category labels.
 *
 * @type {readonly string[]}
 */
export const GOOGLE_PLAY_CATEGORY_LABELS = Object.freeze([
  'Art & Design','Auto & Vehicles','Beauty','Books & Reference','Business','Comics','Communication','Dating',
  'Education','Entertainment','Events','Finance','Food & Drink','Health & Fitness','House & Home',
  'Libraries & Demo','Lifestyle','Maps & Navigation','Medical','Music & Audio','News & Magazines','Parenting',
  'Personalization','Photography','Productivity','Shopping','Social','Sports','Tools','Travel & Local',
  'Video Players & Editors','Weather'
]);
