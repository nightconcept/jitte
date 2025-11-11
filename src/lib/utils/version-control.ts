/**
 * Version control system for deck management
 */

import type { Deck, DeckManifest, CreateBranchOptions } from '$lib/types/deck';
import type { BranchMetadata, VersionMetadata, Stash, VersionScheme } from '$lib/types/version';
import { applyBump, compareVersions as compareSemanticVersions } from './semver';
import { calculateDiff } from './diff';
import { getInitialVersion, getNextVersion, migrateVersionScheme } from './versioning';

/**
 * Create a new version of the deck
 */
export function createVersion(
	manifest: DeckManifest,
	deck: Deck,
	commitMessage: string,
	versionOverride?: string
): { manifest: DeckManifest; version: string } {
	console.log('[createVersion] Starting:', {
		currentVersion: manifest.currentVersion,
		currentBranch: manifest.currentBranch,
		commitMessage,
		versionOverride,
		versioningScheme: manifest.versioningScheme
	});

	const branch = manifest.branches.find((b) => b.name === manifest.currentBranch);
	if (!branch) {
		throw new Error(`Branch ${manifest.currentBranch} not found`);
	}

	console.log('[createVersion] Found branch:', {
		branchName: branch.name,
		existingVersions: branch.versions
	});

	// Determine versioning scheme (default to semantic for backwards compatibility)
	const scheme: VersionScheme = manifest.versioningScheme || 'semantic';

	// Determine new version
	let newVersion: string;
	if (manifest.currentVersion === 'unsaved') {
		// First commit - use initial version for the scheme
		newVersion = versionOverride || getInitialVersion(scheme);
		console.log('[createVersion] First commit, using version:', newVersion);
	} else {
		if (versionOverride) {
			newVersion = versionOverride;
		} else {
			// Auto-calculate next version based on scheme
			if (scheme === 'semantic') {
				// For semantic versioning, calculate diff to determine bump type
				// Default to patch bump for backwards compatibility
				newVersion = applyBump(manifest.currentVersion, 'patch');
			} else {
				// For date-based versioning, calculate next version
				newVersion = getNextVersion(manifest.currentVersion, scheme);
			}
		}
		console.log('[createVersion] Bumping version from', manifest.currentVersion, 'to', newVersion);
	}

	// Create version metadata
	const versionMetadata: VersionMetadata = {
		version: newVersion,
		branch: manifest.currentBranch,
		commitMessage,
		timestamp: new Date().toISOString()
	};

	console.log('[createVersion] Created version metadata:', versionMetadata);

	// Update branch
	const updatedBranch: BranchMetadata = {
		...branch,
		versions: [...branch.versions, versionMetadata],
		currentVersion: newVersion,
		updatedAt: new Date().toISOString()
	};

	console.log('[createVersion] Updated branch versions:', updatedBranch.versions);

	// Update manifest
	const updatedManifest: DeckManifest = {
		...manifest,
		currentVersion: newVersion,
		branches: manifest.branches.map((b) =>
			b.name === manifest.currentBranch ? updatedBranch : b
		),
		updatedAt: new Date().toISOString()
	};

	console.log('[createVersion] Returning updated manifest with', updatedManifest.branches[0]?.versions.length, 'versions');

	return { manifest: updatedManifest, version: newVersion };
}

/**
 * Create a new branch
 */
export function createBranch(
	manifest: DeckManifest,
	options: CreateBranchOptions
): DeckManifest {
	// Validate branch name - cannot be "maybeboards" (reserved for maybeboard storage)
	if (options.name.toLowerCase() === 'maybeboards') {
		throw new Error('Branch name "maybeboards" is reserved');
	}

	// Check if branch already exists
	if (manifest.branches.some((b) => b.name === options.name)) {
		throw new Error(`Branch ${options.name} already exists`);
	}

	const now = new Date().toISOString();
	const sourceBranch = options.sourceBranch || manifest.currentBranch;
	const sourceVersion = options.sourceVersion || manifest.currentVersion;

	let newBranch: BranchMetadata;

	if (options.fromScratch) {
		// Create empty branch using current versioning scheme
		const scheme: VersionScheme = manifest.versioningScheme || 'semantic';
		newBranch = {
			name: options.name,
			versions: [],
			currentVersion: getInitialVersion(scheme),
			createdAt: now,
			updatedAt: now
		};
	} else {
		// Fork from existing branch
		const source = manifest.branches.find((b) => b.name === sourceBranch);
		if (!source) {
			throw new Error(`Source branch ${sourceBranch} not found`);
		}

		// Copy all versions up to the fork point
		const forkIndex = source.versions.findIndex((v) => v.version === sourceVersion);
		if (forkIndex === -1) {
			throw new Error(`Version ${sourceVersion} not found in branch ${sourceBranch}`);
		}

		const copiedVersions = source.versions.slice(0, forkIndex + 1).map((v) => ({
			...v,
			branch: options.name
		}));

		newBranch = {
			name: options.name,
			versions: copiedVersions,
			currentVersion: sourceVersion,
			parentBranch: sourceBranch,
			forkedFromVersion: sourceVersion,
			createdAt: now,
			updatedAt: now
		};
	}

	return {
		...manifest,
		branches: [...manifest.branches, newBranch]
	};
}

/**
 * Switch to a different branch
 */
export function switchBranch(manifest: DeckManifest, branchName: string): DeckManifest {
	const branch = manifest.branches.find((b) => b.name === branchName);
	if (!branch) {
		throw new Error(`Branch ${branchName} not found`);
	}

	return {
		...manifest,
		currentBranch: branchName,
		currentVersion: branch.currentVersion,
		updatedAt: new Date().toISOString()
	};
}

/**
 * Delete a branch
 */
export function deleteBranch(manifest: DeckManifest, branchName: string): DeckManifest {
	// Can't delete main branch
	if (branchName === 'main') {
		throw new Error('Cannot delete main branch');
	}

	// Can't delete current branch
	if (branchName === manifest.currentBranch) {
		throw new Error('Cannot delete current branch. Switch to another branch first.');
	}

	return {
		...manifest,
		branches: manifest.branches.filter((b) => b.name !== branchName),
		// Remove stash for this branch
		stashes: Object.fromEntries(
			Object.entries(manifest.stashes).filter(([key]) => key !== branchName)
		)
	};
}

/**
 * Get all versions for a branch
 */
export function getBranchVersions(
	manifest: DeckManifest,
	branchName: string
): VersionMetadata[] {
	const branch = manifest.branches.find((b) => b.name === branchName);
	return branch?.versions || [];
}

/**
 * Get a specific version metadata
 */
export function getVersionMetadata(
	manifest: DeckManifest,
	branchName: string,
	version: string
): VersionMetadata | undefined {
	const branch = manifest.branches.find((b) => b.name === branchName);
	return branch?.versions.find((v) => v.version === version);
}

/**
 * Check if a version exists
 */
export function versionExists(
	manifest: DeckManifest,
	branchName: string,
	version: string
): boolean {
	return getVersionMetadata(manifest, branchName, version) !== undefined;
}

/**
 * Get the latest version for a branch
 */
export function getLatestVersion(manifest: DeckManifest, branchName: string): string {
	const branch = manifest.branches.find((b) => b.name === branchName);
	return branch?.currentVersion || '0.0.1';
}

/**
 * List all branches
 */
export function listBranches(manifest: DeckManifest): string[] {
	return manifest.branches.map((b) => b.name);
}

/**
 * Get branch metadata
 */
export function getBranchMetadata(
	manifest: DeckManifest,
	branchName: string
): BranchMetadata | undefined {
	return manifest.branches.find((b) => b.name === branchName);
}

/**
 * Rename a branch
 */
export function renameBranch(
	manifest: DeckManifest,
	oldName: string,
	newName: string
): DeckManifest {
	// Can't rename main
	if (oldName === 'main') {
		throw new Error('Cannot rename main branch');
	}

	// Validate new branch name - cannot be "maybeboards" (reserved for maybeboard storage)
	if (newName.toLowerCase() === 'maybeboards') {
		throw new Error('Branch name "maybeboards" is reserved');
	}

	// Check if new name already exists
	if (manifest.branches.some((b) => b.name === newName)) {
		throw new Error(`Branch ${newName} already exists`);
	}

	const now = new Date().toISOString();

	return {
		...manifest,
		currentBranch: manifest.currentBranch === oldName ? newName : manifest.currentBranch,
		branches: manifest.branches.map((b) =>
			b.name === oldName
				? {
						...b,
						name: newName,
						updatedAt: now,
						versions: b.versions.map((v) => ({ ...v, branch: newName }))
				  }
				: b
		),
		// Update stash key if exists
		stashes: Object.fromEntries(
			Object.entries(manifest.stashes).map(([key, value]) => [
				key === oldName ? newName : key,
				key === oldName ? { ...value, branch: newName } : value
			])
		)
	};
}

/**
 * Change the versioning scheme for a deck
 * Migrates the current version to the new scheme
 */
export function changeVersioningScheme(
	manifest: DeckManifest,
	newScheme: VersionScheme
): DeckManifest {
	const currentScheme = manifest.versioningScheme || 'semantic';

	if (currentScheme === newScheme) {
		return manifest; // No change needed
	}

	console.log('[changeVersioningScheme] Migrating from', currentScheme, 'to', newScheme);

	// Migrate current version to new scheme
	const migratedVersion = migrateVersionScheme(
		manifest.currentVersion,
		currentScheme,
		newScheme
	);

	console.log('[changeVersioningScheme] Migrated version from', manifest.currentVersion, 'to', migratedVersion);

	return {
		...manifest,
		versioningScheme: newScheme,
		currentVersion: migratedVersion,
		updatedAt: new Date().toISOString()
	};
}
