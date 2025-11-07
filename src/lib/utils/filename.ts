/**
 * Filename sanitization utilities for cross-platform compatibility
 */

/**
 * Characters that are illegal in Windows filenames
 */
const WINDOWS_ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

/**
 * Reserved filenames in Windows
 */
const WINDOWS_RESERVED_NAMES = new Set([
	'CON',
	'PRN',
	'AUX',
	'NUL',
	'COM1',
	'COM2',
	'COM3',
	'COM4',
	'COM5',
	'COM6',
	'COM7',
	'COM8',
	'COM9',
	'LPT1',
	'LPT2',
	'LPT3',
	'LPT4',
	'LPT5',
	'LPT6',
	'LPT7',
	'LPT8',
	'LPT9'
]);

/**
 * Maximum filename length (safe for all platforms)
 * Windows: 255, macOS: 255, Linux: 255
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * Maximum safe length accounting for extensions and system overhead
 */
const MAX_SAFE_LENGTH = 200;

/**
 * Sanitizes a deck name for use as a filename
 *
 * Ensures compatibility across Windows, macOS, and Linux by:
 * - Removing illegal characters
 * - Avoiding reserved names
 * - Limiting length
 * - Trimming whitespace and dots
 * - Replacing multiple spaces with single space
 *
 * @param deckName - The deck name to sanitize
 * @param replacement - Character to replace illegal chars with (default: '-')
 * @returns Sanitized filename-safe string
 */
export function sanitizeDeckName(deckName: string, replacement = '-'): string {
	if (!deckName || typeof deckName !== 'string') {
		return 'untitled-deck';
	}

	let sanitized = deckName
		// Trim leading/trailing whitespace first
		.trim()
		// Remove illegal Windows characters
		.replace(WINDOWS_ILLEGAL_CHARS, replacement)
		// Replace multiple spaces with single space
		.replace(/\s+/g, ' ')
		// Remove leading/trailing dots (Windows doesn't allow)
		.replace(/^\.+|\.+$/g, '');

	// Check if empty after sanitization
	if (!sanitized) {
		return 'untitled-deck';
	}

	// Check for Windows reserved names (case-insensitive)
	const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
	if (WINDOWS_RESERVED_NAMES.has(nameWithoutExt)) {
		sanitized = `${sanitized}_deck`;
	}

	// Truncate if too long
	if (sanitized.length > MAX_SAFE_LENGTH) {
		sanitized = sanitized.substring(0, MAX_SAFE_LENGTH).trim();
	}

	return sanitized;
}

/**
 * Creates a filename for a deck zip file
 *
 * @param deckName - The deck name
 * @returns Sanitized filename with .zip extension
 */
export function getDeckFilename(deckName: string): string {
	const sanitized = sanitizeDeckName(deckName);
	return `${sanitized}.zip`;
}

/**
 * Creates a filename for a specific version
 *
 * @param version - Version string (e.g., "1.2.3")
 * @returns Filename for the version (e.g., "v1.2.3.txt")
 */
export function getVersionFilename(version: string): string {
	// Version strings should already be safe, but sanitize just in case
	const sanitized = version.replace(/[^0-9a-zA-Z.-]/g, '_');
	return `v${sanitized}.txt`;
}

/**
 * Creates a filename for branch metadata
 *
 * @param branchName - Branch name
 * @returns Filename for branch metadata
 */
export function getBranchMetadataFilename(branchName: string): string {
	const sanitized = sanitizeDeckName(branchName);
	return `${sanitized}/metadata.json`;
}

/**
 * Validates if a string is a safe filename
 *
 * @param filename - The filename to validate
 * @returns True if filename is safe for all platforms
 */
export function isValidFilename(filename: string): boolean {
	if (!filename || typeof filename !== 'string') {
		return false;
	}

	// Check length
	if (filename.length > MAX_FILENAME_LENGTH) {
		return false;
	}

	// Check for illegal characters (create new regex to avoid state issues with global flag)
	if (/[<>:"/\\|?*\x00-\x1F]/.test(filename)) {
		return false;
	}

	// Check for reserved names
	const nameWithoutExt = filename.split('.')[0].toUpperCase();
	if (WINDOWS_RESERVED_NAMES.has(nameWithoutExt)) {
		return false;
	}

	// Check for leading/trailing dots or spaces
	if (filename !== filename.trim() || /^\.+|\.+$/.test(filename)) {
		return false;
	}

	return true;
}

/**
 * Extracts deck name from a filename
 *
 * @param filename - Filename (with or without .zip extension)
 * @returns Deck name
 */
export function extractDeckName(filename: string): string {
	// Remove .zip extension if present
	const name = filename.replace(/\.zip$/i, '');

	// Return the name
	return name.trim();
}

/**
 * Generates a unique filename if one already exists
 *
 * @param baseName - Base filename
 * @param existingNames - Set of existing filenames
 * @returns Unique filename
 */
export function makeUniqueDeckName(baseName: string, existingNames: Set<string>): string {
	const sanitized = sanitizeDeckName(baseName);

	if (!existingNames.has(sanitized)) {
		return sanitized;
	}

	// Append number to make unique
	let counter = 1;
	let uniqueName = sanitized;

	while (existingNames.has(uniqueName)) {
		uniqueName = `${sanitized}-${counter}`;
		counter++;

		// Prevent infinite loop
		if (counter > 1000) {
			uniqueName = `${sanitized}-${Date.now()}`;
			break;
		}
	}

	return uniqueName;
}
