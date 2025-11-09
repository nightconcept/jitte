/**
 * Utility functions for managing onboarding state
 */

const ONBOARDING_KEY = 'jitte_onboarding_completed';

/**
 * Check if the user has completed the onboarding process
 */
export function hasCompletedOnboarding(): boolean {
	if (typeof window === 'undefined') return true; // SSR safety
	return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(): void {
	if (typeof window === 'undefined') return; // SSR safety
	localStorage.setItem(ONBOARDING_KEY, 'true');
}

/**
 * Reset onboarding status (for "Redo Onboarding" feature)
 */
export function resetOnboarding(): void {
	if (typeof window === 'undefined') return; // SSR safety
	localStorage.removeItem(ONBOARDING_KEY);
}
