/**
 * Version control system for deck management
 */

import type { Deck, DeckManifest, CreateBranchOptions } from '$lib/types/deck';
import type { BranchMetadata, VersionMetadata, Stash } from '$lib/types/version';
import { applyBump, compareVersions } from './semver';
import { calculateDiff } from './diff';

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
		versionOverride
	});

	const branch = manifest.branches.find((b) => b.name === manifest.currentBranch);
	if (!branch) {
		throw new Error(`Branch ${manifest.currentBranch} not found`);
	}

	console.log('[createVersion] Found branch:', {
		branchName: branch.name,
		existingVersions: branch.versions
	});

	// Determine new version
	// If currentVersion is "unsaved", this is the first commit, so use 0.0.1
	let newVersion: string;
	if (manifest.currentVersion === 'unsaved') {
		newVersion = versionOverride || '0.0.1';
		console.log('[createVersion] First commit, using version:', newVersion);
	} else {
		newVersion = versionOverride || applyBump(manifest.currentVersion, 'patch');
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
	// Check if branch already exists
	if (manifest.branches.some((b) => b.name === options.name)) {
		throw new Error(`Branch ${options.name} already exists`);
	}

	const now = new Date().toISOString();
	const sourceBranch = options.sourceBranch || manifest.currentBranch;
	const sourceVersion = options.sourceVersion || manifest.currentVersion;

	let newBranch: BranchMetadata;

	if (options.fromScratch) {
		// Create empty branch
		newBranch = {
			name: options.name,
			versions: [],
			currentVersion: '0.0.1',
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
