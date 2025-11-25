/**
 * Feature Flags
 *
 * Central configuration for enabling/disabling features.
 * Use these flags to control expensive API calls or experimental features.
 */

/**
 * Enable salt score calculations and EDHREC API calls.
 *
 * When disabled:
 * - No EDHREC API calls will be made
 * - Salt score will not be displayed in the UI
 * - Prevents EDHREC throttling issues
 *
 * Default: false (disabled to avoid EDHREC throttling)
 */
export const ENABLE_SALT_SCORES = false;

/**
 * Enable EDHREC recommendations for commanders.
 *
 * When disabled:
 * - No EDHREC recommendation API calls will be made
 * - Recommendations modal will not show EDHREC data
 * - Prevents CORS/throttling issues
 *
 * Default: false (disabled - corsproxy.io is unreliable)
 */
export const ENABLE_EDHREC_RECOMMENDATIONS = false;

/**
 * Enable Commander Spellbook combo detection.
 *
 * When disabled:
 * - No Commander Spellbook API calls will be made
 * - Combo detection will not be shown
 * - Prevents CORS/throttling issues
 *
 * Default: false (disabled - corsproxy.io is unreliable)
 */
export const ENABLE_COMBO_DETECTION = false;
