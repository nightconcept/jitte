/**
 * Utility functions for formatting dates
 */

/**
 * Format an ISO date string to "Month Year" format
 * @param isoDate - ISO date string (e.g., "2023-08-04")
 * @returns Formatted date string (e.g., "August 2023")
 */
export function formatSetReleaseDate(isoDate: string): string {
	const date = new Date(isoDate);
	return date.toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric'
	});
}
