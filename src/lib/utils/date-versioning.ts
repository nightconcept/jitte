/**
 * Date-based versioning utilities (YY.MM.DD-rev.N)
 */

import type { DateVersion } from '$lib/types/version';

/**
 * Parse a date-based version string
 * Format: YY.MM.DD-rev.N
 * Example: 25.01.15-rev.1
 */
export function parseDateVersion(versionString: string): DateVersion {
	const match = versionString.match(/^(\d{2})\.(\d{2})\.(\d{2})-rev\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid date version string: ${versionString}`);
	}

	return {
		year: Number.parseInt(match[1], 10),
		month: Number.parseInt(match[2], 10),
		day: Number.parseInt(match[3], 10),
		revision: Number.parseInt(match[4], 10)
	};
}

/**
 * Format a date version as a string
 */
export function formatDateVersion(version: DateVersion): string {
	const year = version.year.toString().padStart(2, '0');
	const month = version.month.toString().padStart(2, '0');
	const day = version.day.toString().padStart(2, '0');
	return `${year}.${month}.${day}-rev.${version.revision}`;
}

/**
 * Get today's date as a DateVersion base (revision will be 1)
 */
export function getTodayDateVersion(): DateVersion {
	const now = new Date();
	return {
		year: now.getFullYear() % 100, // Last 2 digits
		month: now.getMonth() + 1,
		day: now.getDate(),
		revision: 1
	};
}

/**
 * Increment the revision number for a date version
 */
export function bumpRevision(version: DateVersion): DateVersion {
	return {
		...version,
		revision: version.revision + 1
	};
}

/**
 * Get the next date-based version
 * - If today's date is different from current, start at rev.1
 * - If same day, increment revision
 */
export function getNextDateVersion(currentVersionString: string): string {
	try {
		const current = parseDateVersion(currentVersionString);
		const today = getTodayDateVersion();

		// Check if it's the same day
		if (
			current.year === today.year &&
			current.month === today.month &&
			current.day === today.day
		) {
			// Same day, bump revision
			return formatDateVersion(bumpRevision(current));
		}
		// Different day, start at rev.1
		return formatDateVersion(today);
	} catch {
		// If parsing fails (probably switching from semantic), start fresh
		return formatDateVersion(getTodayDateVersion());
	}
}

/**
 * Compare two date versions
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareDateVersions(a: string, b: string): number {
	const versionA = parseDateVersion(a);
	const versionB = parseDateVersion(b);

	// Compare year
	if (versionA.year !== versionB.year) {
		return versionA.year - versionB.year;
	}
	// Compare month
	if (versionA.month !== versionB.month) {
		return versionA.month - versionB.month;
	}
	// Compare day
	if (versionA.day !== versionB.day) {
		return versionA.day - versionB.day;
	}
	// Compare revision
	return versionA.revision - versionB.revision;
}

/**
 * Check if a version string is a valid date version
 */
export function isValidDateVersion(versionString: string): boolean {
	try {
		const version = parseDateVersion(versionString);
		// Validate ranges
		return (
			version.year >= 0 &&
			version.year <= 99 &&
			version.month >= 1 &&
			version.month <= 12 &&
			version.day >= 1 &&
			version.day <= 31 &&
			version.revision >= 1
		);
	} catch {
		return false;
	}
}
