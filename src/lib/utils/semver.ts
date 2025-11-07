/**
 * Semantic versioning utilities
 */

import type { SemanticVersion, SemverThresholds } from '$lib/types/version';

/**
 * Default thresholds for version bump suggestions
 */
export const DEFAULT_SEMVER_THRESHOLDS: SemverThresholds = {
	patch: 2, // 1-2 changes = patch
	minor: 10 // 3-10 changes = minor, 11+ = major
};

/**
 * Parse a version string into components
 */
export function parseVersion(versionString: string): SemanticVersion {
	const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid version string: ${versionString}`);
	}

	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10)
	};
}

/**
 * Format a semantic version as a string
 */
export function formatVersion(version: SemanticVersion): string {
	return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Bump major version (x.0.0)
 */
export function bumpMajor(version: SemanticVersion): SemanticVersion {
	return {
		major: version.major + 1,
		minor: 0,
		patch: 0
	};
}

/**
 * Bump minor version (0.x.0)
 */
export function bumpMinor(version: SemanticVersion): SemanticVersion {
	return {
		major: version.major,
		minor: version.minor + 1,
		patch: 0
	};
}

/**
 * Bump patch version (0.0.x)
 */
export function bumpPatch(version: SemanticVersion): SemanticVersion {
	return {
		major: version.major,
		minor: version.minor,
		patch: version.patch + 1
	};
}

/**
 * Suggest a version bump based on number of changes
 */
export function suggestVersionBump(
	changeCount: number,
	thresholds: SemverThresholds = DEFAULT_SEMVER_THRESHOLDS
): 'major' | 'minor' | 'patch' {
	if (changeCount <= thresholds.patch) {
		return 'patch';
	}
	if (changeCount <= thresholds.minor) {
		return 'minor';
	}
	return 'major';
}

/**
 * Apply a version bump to a version string
 */
export function applyBump(
	versionString: string,
	bumpType: 'major' | 'minor' | 'patch'
): string {
	const version = parseVersion(versionString);

	let newVersion: SemanticVersion;
	switch (bumpType) {
		case 'major':
			newVersion = bumpMajor(version);
			break;
		case 'minor':
			newVersion = bumpMinor(version);
			break;
		case 'patch':
			newVersion = bumpPatch(version);
			break;
	}

	return formatVersion(newVersion);
}

/**
 * Compare two versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
	const versionA = parseVersion(a);
	const versionB = parseVersion(b);

	if (versionA.major !== versionB.major) {
		return versionA.major - versionB.major;
	}
	if (versionA.minor !== versionB.minor) {
		return versionA.minor - versionB.minor;
	}
	return versionA.patch - versionB.patch;
}

/**
 * Check if a version string is valid
 */
export function isValidVersion(versionString: string): boolean {
	try {
		parseVersion(versionString);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get the next version based on change count
 */
export function getNextVersion(
	currentVersion: string,
	changeCount: number,
	thresholds?: SemverThresholds
): string {
	const bumpType = suggestVersionBump(changeCount, thresholds);
	return applyBump(currentVersion, bumpType);
}
