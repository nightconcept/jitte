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
