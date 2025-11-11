/**
 * Unified versioning API supporting both semantic and date-based schemes
 */

import type { VersionScheme } from '$lib/types/version';
import {
	isValidVersion as isValidSemanticVersion,
	compareVersions as compareSemanticVersions,
	getNextVersion as getNextSemanticVersion
} from './semver';
import {
	isValidDateVersion,
	compareDateVersions,
	getNextDateVersion,
	getTodayDateVersion,
	formatDateVersion
} from './date-versioning';

/**
 * Detect version scheme from version string
 */
export function detectVersionScheme(versionString: string): VersionScheme | null {
	if (versionString === 'unsaved') {
		return null;
	}
	if (isValidSemanticVersion(versionString)) {
		return 'semantic';
	}
	if (isValidDateVersion(versionString)) {
		return 'date';
	}
	return null;
}

/**
 * Check if version string is valid for given scheme
 */
export function isValidVersionForScheme(
	versionString: string,
	scheme: VersionScheme
): boolean {
	if (scheme === 'semantic') {
		return isValidSemanticVersion(versionString);
	}
	return isValidDateVersion(versionString);
}

/**
 * Compare two versions using appropriate scheme
 * If schemes differ, uses detection. Returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string, scheme?: VersionScheme): number {
	const schemeA = scheme || detectVersionScheme(a);
	const schemeB = scheme || detectVersionScheme(b);

	// If both are semantic, compare as semantic
	if (schemeA === 'semantic' && schemeB === 'semantic') {
		return compareSemanticVersions(a, b);
	}

	// If both are date-based, compare as date
	if (schemeA === 'date' && schemeB === 'date') {
		return compareDateVersions(a, b);
	}

	// Mixed schemes - fall back to string comparison
	// This is an edge case that shouldn't happen often
	console.warn('Comparing versions with different schemes:', { a, b });
	return a.localeCompare(b);
}

/**
 * Get next version based on scheme
 * @param currentVersion - Current version string
 * @param scheme - Versioning scheme to use
 * @param changeCount - Required for semantic versioning only
 */
export function getNextVersion(
	currentVersion: string,
	scheme: VersionScheme,
	changeCount?: number
): string {
	if (scheme === 'semantic') {
		if (changeCount === undefined) {
			throw new Error('changeCount required for semantic versioning');
		}
		return getNextSemanticVersion(currentVersion, changeCount);
	}
	return getNextDateVersion(currentVersion);
}

/**
 * Get initial version for a scheme
 */
export function getInitialVersion(scheme: VersionScheme): string {
	if (scheme === 'semantic') {
		return '0.0.1';
	}
	// Today's date, revision 1
	return formatDateVersion(getTodayDateVersion());
}

/**
 * Migrate from one scheme to another
 * Returns the equivalent "starting point" in the new scheme
 */
export function migrateVersionScheme(
	currentVersion: string,
	fromScheme: VersionScheme,
	toScheme: VersionScheme
): string {
	if (fromScheme === toScheme) {
		return currentVersion;
	}

	// When switching schemes, start fresh with the initial version
	// This avoids confusion about version ordering and compatibility
	return getInitialVersion(toScheme);
}
