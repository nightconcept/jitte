/**
 * Version Reconstruction Utilities
 *
 * Handles reconstructing deck versions from base snapshots and deltas.
 * Optimized for efficient version loading with delta chains.
 */

import type { CardReferencesByCategory } from '$lib/types/card-reference';
import type {
	VersionBase,
	VersionContent,
	ReconstructedVersion,
	VersionMeta,
	BranchBaseInfo
} from '$lib/types/version-delta';
import { isVersionBase, isVersionDelta } from '$lib/types/version-delta';
import { applyEnhancedDelta, type EnhancedVersionDelta } from './version-delta';
import type { StoredVersion } from '$lib/storage/deck-database';

/**
 * Reconstruct a specific version from stored versions
 *
 * Process:
 * 1. Find the base version this target derives from
 * 2. Collect all deltas between base and target
 * 3. Apply deltas in order to reconstruct target state
 *
 * @param targetVersion - The version to reconstruct (e.g., "1.5.0")
 * @param storedVersions - All stored versions for this branch
 * @returns Reconstructed version with cards and metadata
 */
export function reconstructVersion(
	targetVersion: string,
	storedVersions: StoredVersion[]
): ReconstructedVersion {
	const startTime = performance.now();

	// Build version map for quick lookup
	const versionMap = new Map<string, StoredVersion>();
	for (const sv of storedVersions) {
		versionMap.set(sv.version, sv);
	}

	// Find the target version
	const targetStored = versionMap.get(targetVersion);
	if (!targetStored) {
		throw new Error(`Version ${targetVersion} not found`);
	}

	// If target is a base, return it directly
	if (targetStored.isBase && isVersionBase(targetStored.content)) {
		return {
			cards: targetStored.content.cards,
			meta: {
				version: targetVersion,
				baseVersion: targetVersion,
				deltasApplied: 0,
				reconstructionTimeMs: performance.now() - startTime
			}
		};
	}

	// Target is a delta - need to find base and apply deltas
	if (!isVersionDelta(targetStored.content)) {
		throw new Error(`Version ${targetVersion} has invalid content type`);
	}

	const targetDelta = targetStored.content as EnhancedVersionDelta;
	const baseVersion = targetDelta.baseVersion;

	// Find the base version
	const baseStored = versionMap.get(baseVersion);
	if (!baseStored || !isVersionBase(baseStored.content)) {
		throw new Error(`Base version ${baseVersion} not found or invalid`);
	}

	// Collect deltas from base to target
	const deltasToApply: EnhancedVersionDelta[] = [];
	let currentVersion = targetVersion;

	while (currentVersion !== baseVersion) {
		const stored = versionMap.get(currentVersion);
		if (!stored) {
			throw new Error(`Version ${currentVersion} not found in delta chain`);
		}

		if (!isVersionDelta(stored.content)) {
			throw new Error(`Expected delta for version ${currentVersion}`);
		}

		deltasToApply.unshift(stored.content as EnhancedVersionDelta);
		currentVersion = (stored.content as EnhancedVersionDelta).previousVersion;
	}

	// Start with base and apply deltas
	let cards = (baseStored.content as VersionBase).cards;

	for (const delta of deltasToApply) {
		cards = applyEnhancedDelta(cards, delta);
	}

	return {
		cards,
		meta: {
			version: targetVersion,
			baseVersion,
			deltasApplied: deltasToApply.length,
			reconstructionTimeMs: performance.now() - startTime
		}
	};
}

/**
 * Find the nearest base version for a given version
 */
export function findNearestBase(
	targetVersion: string,
	storedVersions: StoredVersion[]
): string | null {
	const versionMap = new Map<string, StoredVersion>();
	for (const sv of storedVersions) {
		versionMap.set(sv.version, sv);
	}

	const target = versionMap.get(targetVersion);
	if (!target) {
		return null;
	}

	// If it's a base, return itself
	if (target.isBase) {
		return targetVersion;
	}

	// Otherwise, follow the delta chain
	if (isVersionDelta(target.content)) {
		return (target.content as EnhancedVersionDelta).baseVersion;
	}

	return null;
}

/**
 * Build branch base information for efficient reconstruction
 */
export function buildBranchBaseInfo(
	branch: string,
	storedVersions: StoredVersion[]
): BranchBaseInfo {
	const bases: string[] = [];
	const versionToBase: Record<string, string> = {};

	// Filter to this branch and sort by version
	const branchVersions = storedVersions
		.filter((sv) => sv.branch === branch)
		.sort((a, b) => compareVersions(a.version, b.version));

	for (const sv of branchVersions) {
		if (sv.isBase) {
			bases.push(sv.version);
			versionToBase[sv.version] = sv.version;
		} else if (isVersionDelta(sv.content)) {
			const delta = sv.content as EnhancedVersionDelta;
			versionToBase[sv.version] = delta.baseVersion;
		}
	}

	return {
		branch,
		bases,
		versionToBase
	};
}

/**
 * Get the delta chain length from base to target
 */
export function getDeltaChainLength(
	targetVersion: string,
	storedVersions: StoredVersion[]
): number {
	const versionMap = new Map<string, StoredVersion>();
	for (const sv of storedVersions) {
		versionMap.set(sv.version, sv);
	}

	const target = versionMap.get(targetVersion);
	if (!target) {
		return -1;
	}

	if (target.isBase) {
		return 0;
	}

	let count = 0;
	let current: StoredVersion | undefined = target;

	while (current && !current.isBase && isVersionDelta(current.content)) {
		count++;
		const delta = current.content as EnhancedVersionDelta;
		current = versionMap.get(delta.previousVersion);
	}

	return count;
}

/**
 * Determine if a new base should be created based on chain length
 */
export function shouldCreateNewBase(
	storedVersions: StoredVersion[],
	currentVersion: string,
	maxChainLength: number = 10
): boolean {
	const chainLength = getDeltaChainLength(currentVersion, storedVersions);
	return chainLength >= maxChainLength;
}

/**
 * Get all versions that depend on a specific base
 */
export function getVersionsFromBase(
	baseVersion: string,
	storedVersions: StoredVersion[]
): string[] {
	const dependentVersions: string[] = [];

	for (const sv of storedVersions) {
		if (isVersionDelta(sv.content)) {
			const delta = sv.content as EnhancedVersionDelta;
			if (delta.baseVersion === baseVersion) {
				dependentVersions.push(sv.version);
			}
		}
	}

	return dependentVersions;
}

/**
 * Validate a delta chain for consistency
 */
export function validateDeltaChain(
	storedVersions: StoredVersion[]
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const versionMap = new Map<string, StoredVersion>();

	for (const sv of storedVersions) {
		versionMap.set(sv.version, sv);
	}

	for (const sv of storedVersions) {
		if (sv.isBase) {
			// Base versions should have VersionBase content
			if (!isVersionBase(sv.content)) {
				errors.push(`Base version ${sv.version} has non-base content`);
			}
		} else {
			// Delta versions should reference existing versions
			if (!isVersionDelta(sv.content)) {
				errors.push(`Delta version ${sv.version} has non-delta content`);
				continue;
			}

			const delta = sv.content as EnhancedVersionDelta;

			// Check base exists
			if (!versionMap.has(delta.baseVersion)) {
				errors.push(`Version ${sv.version} references missing base ${delta.baseVersion}`);
			}

			// Check previous exists
			if (!versionMap.has(delta.previousVersion)) {
				errors.push(`Version ${sv.version} references missing previous ${delta.previousVersion}`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Compare two semantic version strings
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
	const partsA = a.split('.').map(Number);
	const partsB = b.split('.').map(Number);

	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const partA = partsA[i] || 0;
		const partB = partsB[i] || 0;

		if (partA < partB) return -1;
		if (partA > partB) return 1;
	}

	return 0;
}

/**
 * Get the next version number after applying a change type
 */
export function getNextVersion(
	currentVersion: string,
	changeType: 'major' | 'minor' | 'patch'
): string {
	const parts = currentVersion.split('.').map(Number);

	switch (changeType) {
		case 'major':
			return `${parts[0] + 1}.0.0`;
		case 'minor':
			return `${parts[0]}.${parts[1] + 1}.0`;
		case 'patch':
		default:
			return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
	}
}

/**
 * Extract version metadata from stored versions
 */
export function extractVersionMeta(storedVersions: StoredVersion[]): VersionMeta[] {
	return storedVersions.map((sv) => sv.meta);
}

/**
 * Get the most recent version for a branch
 */
export function getMostRecentVersion(
	branch: string,
	storedVersions: StoredVersion[]
): string | null {
	const branchVersions = storedVersions
		.filter((sv) => sv.branch === branch)
		.sort((a, b) => compareVersions(b.version, a.version)); // Descending

	return branchVersions.length > 0 ? branchVersions[0].version : null;
}

/**
 * Count versions since the last base
 */
export function countVersionsSinceBase(
	currentVersion: string,
	storedVersions: StoredVersion[]
): number {
	const versionMap = new Map<string, StoredVersion>();
	for (const sv of storedVersions) {
		versionMap.set(sv.version, sv);
	}

	const current = versionMap.get(currentVersion);
	if (!current) {
		return 0;
	}

	if (current.isBase) {
		return 0;
	}

	return getDeltaChainLength(currentVersion, storedVersions);
}
