/**
 * Zip file compression and decompression utilities
 * Uses browser-native Compression Streams API
 */

import type { DeckManifest, Maybeboard } from '$lib/types';

/**
 * Structure of files within a deck zip archive
 */
export interface DeckArchive {
	/** manifest.json - Deck metadata and branch info */
	manifest: DeckManifest;

	/** maybeboard.json - Shared maybeboard across all versions */
	maybeboard: Maybeboard;

	/** Version files organized by branch */
	versions: Record<string, Record<string, string>>;
	// Example: { "main": { "v1.0.0.txt": "decklist content", "v1.1.0.txt": "..." } }

	/** stash.json - Per-branch unsaved changes */
	stashes?: Record<string, string>;
}

/**
 * File entry in zip archive
 */
interface ZipFileEntry {
	path: string;
	content: string | Blob;
}

/**
 * Compresses a deck archive to a zip file
 *
 * @param archive - Deck archive structure
 * @param deckName - Name of the deck (for the zip filename)
 * @returns Blob containing the zip file
 */
export async function compressDeckArchive(archive: DeckArchive, _deckName: string): Promise<Blob> {
	const files: ZipFileEntry[] = [];

	// Add manifest.json
	files.push({
		path: 'manifest.json',
		content: JSON.stringify(archive.manifest, null, 2)
	});

	// Add maybeboard.json
	files.push({
		path: 'maybeboard.json',
		content: JSON.stringify(archive.maybeboard, null, 2)
	});

	// Add version files for each branch
	for (const [branchName, versions] of Object.entries(archive.versions)) {
		for (const [versionFile, content] of Object.entries(versions)) {
			files.push({
				path: `${branchName}/${versionFile}`,
				content: content
			});
		}
	}

	// Add stashes if present
	if (archive.stashes) {
		for (const [branchName, stashContent] of Object.entries(archive.stashes)) {
			files.push({
				path: `${branchName}/stash.txt`,
				content: stashContent
			});
		}
	}

	return await createZipFile(files);
}

/**
 * Decompresses a zip file to a deck archive
 *
 * @param zipBlob - Blob containing the zip file
 * @returns Deck archive structure
 */
export async function decompressDeckArchive(zipBlob: Blob): Promise<DeckArchive> {
	const files = await extractZipFile(zipBlob);

	// Parse manifest
	const manifestFile = files.find((f) => f.path === 'manifest.json');
	if (!manifestFile) {
		throw new Error('Invalid deck archive: manifest.json not found');
	}
	const manifest: DeckManifest = JSON.parse(manifestFile.content);

	// Parse maybeboard
	const maybeboardFile = files.find((f) => f.path === 'maybeboard.json');
	if (!maybeboardFile) {
		throw new Error('Invalid deck archive: maybeboard.json not found');
	}
	const maybeboard: Maybeboard = JSON.parse(maybeboardFile.content);

	// Parse version files by branch
	const versions: Record<string, Record<string, string>> = {};
	const stashes: Record<string, string> = {};

	for (const file of files) {
		// Skip manifest and maybeboard
		if (file.path === 'manifest.json' || file.path === 'maybeboard.json') {
			continue;
		}

		// Parse branch/version structure
		const pathParts = file.path.split('/');
		if (pathParts.length === 2) {
			const [branchName, fileName] = pathParts;

			if (fileName === 'stash.txt') {
				stashes[branchName] = file.content;
			} else if (fileName.startsWith('v') && fileName.endsWith('.txt')) {
				if (!versions[branchName]) {
					versions[branchName] = {};
				}
				versions[branchName][fileName] = file.content;
			}
		}
	}

	return {
		manifest,
		maybeboard,
		versions,
		stashes: Object.keys(stashes).length > 0 ? stashes : undefined
	};
}

/**
 * Creates a zip file from file entries using JSZip library
 *
 * @param files - Array of file entries
 * @returns Blob containing zip file
 */
async function createZipFile(files: ZipFileEntry[]): Promise<Blob> {
	const JSZip = (await import('jszip')).default;
	const zip = new JSZip();

	for (const file of files) {
		zip.file(file.path, file.content);
	}

	return await zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 6 // Balance between speed and compression
		}
	});
}

/**
 * Extracts files from a zip blob
 *
 * @param zipBlob - Blob containing zip file
 * @returns Array of extracted files
 */
async function extractZipFile(zipBlob: Blob): Promise<Array<{ path: string; content: string }>> {
	const JSZip = (await import('jszip')).default;
	const zip = await JSZip.loadAsync(zipBlob);

	const files: Array<{ path: string; content: string }> = [];

	for (const [path, file] of Object.entries(zip.files)) {
		// Skip directories
		if (!file.dir) {
			const content = await file.async('string');
			files.push({ path, content });
		}
	}

	return files;
}

/**
 * Validates a deck archive structure
 *
 * @param archive - Archive to validate
 * @returns True if valid
 */
export function isValidDeckArchive(archive: Partial<DeckArchive>): archive is DeckArchive {
	if (!archive.manifest || !archive.maybeboard || !archive.versions) {
		return false;
	}

	// Validate manifest has required fields
	if (
		!archive.manifest.name ||
		!archive.manifest.format ||
		!archive.manifest.currentBranch ||
		!archive.manifest.branches
	) {
		return false;
	}

	return true;
}

/**
 * Gets the size of a deck archive in bytes
 *
 * @param archive - Deck archive
 * @returns Estimated size in bytes
 */
export function getArchiveSize(archive: DeckArchive): number {
	let size = 0;

	// Manifest
	size += JSON.stringify(archive.manifest).length;

	// Maybeboard
	size += JSON.stringify(archive.maybeboard).length;

	// Versions
	for (const versions of Object.values(archive.versions)) {
		for (const content of Object.values(versions)) {
			size += content.length;
		}
	}

	// Stashes
	if (archive.stashes) {
		for (const stash of Object.values(archive.stashes)) {
			size += stash.length;
		}
	}

	return size;
}
