<script lang="ts">
	/**
	 * Changelog Modal
	 * Shows version history with git-style diffs
	 */
	import BaseModal from './BaseModal.svelte';
	import type { DeckManifest } from '$lib/types/deck';
	import type { VersionMetadata } from '$lib/types/version';
	import type { VersionDiff } from '$lib/types/version';
	import { deckManager } from '$lib/stores/deck-manager';
	import { calculateDiff } from '$lib/utils/diff';

	let {
		isOpen = false,
		manifest,
		onClose = undefined
	}: {
		isOpen: boolean;
		manifest: DeckManifest;
		onClose?: () => void;
	} = $props();

	// Reactive state
	let selectedBranch = $state(manifest.currentBranch);
	let openVersions = $state<Set<string>>(new Set());
	let versionDiffs = $state<Map<string, VersionDiff | null>>(new Map());
	let loadingDiffs = $state<Set<string>>(new Set());

	// Get versions for selected branch
	let currentBranchMetadata = $derived(
		manifest.branches.find((b) => b.name === selectedBranch)
	);
	let versions = $derived(
		(currentBranchMetadata?.versions || []).slice().reverse() // Most recent first
	);

	// Toggle accordion
	function toggleVersion(version: string) {
		const newSet = new Set(openVersions);
		if (newSet.has(version)) {
			newSet.delete(version);
		} else {
			newSet.add(version);
			// Load diff if not already loaded
			if (!versionDiffs.has(version)) {
				loadDiff(version);
			}
		}
		openVersions = newSet;
	}

	// Load diff for a version (compare with previous version)
	async function loadDiff(version: string) {
		if (!currentBranchMetadata) return;

		loadingDiffs = new Set(loadingDiffs).add(version);

		try {
			// Find the index of this version
			const versionIndex = currentBranchMetadata.versions.findIndex(
				(v) => v.version === version
			);

			if (versionIndex === -1) {
				versionDiffs.set(version, null);
				return;
			}

			// If this is the first version, show everything as added
			if (versionIndex === 0) {
				const currentDeck = await deckManager.loadVersionData(version, selectedBranch);
				if (!currentDeck) {
					versionDiffs.set(version, null);
					return;
				}

				// Create a "diff" showing all cards as added
				const allCards: any[] = [];
				for (const category of Object.values(currentDeck.cards)) {
					for (const card of category) {
						allCards.push({
							name: card.name,
							setCode: card.setCode,
							newQuantity: card.quantity,
							quantityDelta: card.quantity,
							price: card.price
						});
					}
				}

				versionDiffs.set(version, {
					added: allCards,
					removed: [],
					modified: [],
					totalChanges: allCards.reduce((sum, c) => sum + c.quantityDelta, 0),
					suggestedBump: 'major' as const
				});
				return;
			}

			// Load both versions
			const previousVersion = currentBranchMetadata.versions[versionIndex - 1].version;
			const [previousDeck, currentDeck] = await Promise.all([
				deckManager.loadVersionData(previousVersion, selectedBranch),
				deckManager.loadVersionData(version, selectedBranch)
			]);

			if (!previousDeck || !currentDeck) {
				versionDiffs.set(version, null);
				return;
			}

			// Calculate diff
			const diff = calculateDiff(previousDeck, currentDeck);
			versionDiffs.set(version, diff);
		} catch (error) {
			console.error('Failed to load diff:', error);
			versionDiffs.set(version, null);
		} finally {
			const newSet = new Set(loadingDiffs);
			newSet.delete(version);
			loadingDiffs = newSet;
		}
	}

	// Format timestamp
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<BaseModal
	{isOpen}
	{onClose}
	title="Changelog"
	size="4xl"
	height="h-[85vh]"
>
	{#snippet children()}
		<!-- Branch Selector -->
		<div class="px-6 py-3 border-b border-[var(--color-border)]">
			<label class="text-sm text-[var(--color-text-secondary)] mr-3">Branch:</label>
			<select
				bind:value={selectedBranch}
				class="px-3 py-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm"
			>
				{#each manifest.branches as branch}
					<option value={branch.name}>{branch.name}</option>
				{/each}
			</select>
		</div>

		<!-- Versions List -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{#if versions.length === 0}
				<div class="text-center text-[var(--color-text-secondary)] py-8">
					No versions in this branch yet
				</div>
			{:else}
				<div class="space-y-2">
					{#each versions as versionMeta (versionMeta.version)}
						<div class="border border-[var(--color-border)] rounded">
							<!-- Accordion Header -->
							<button
								onclick={() => toggleVersion(versionMeta.version)}
								class="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors"
							>
								<div class="flex items-center gap-3">
									<!-- Expand Icon -->
									<svg
										class="w-4 h-4 text-[var(--color-text-secondary)] transition-transform {openVersions.has(
											versionMeta.version
										)
											? 'rotate-90'
											: ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>

									<div class="text-left">
										<div class="flex items-center gap-2">
											<span class="font-mono font-semibold text-[var(--color-brand-primary)]">
												{versionMeta.version}
											</span>
											<span class="text-sm text-[var(--color-text-secondary)]">
												{formatTimestamp(versionMeta.timestamp)}
											</span>
										</div>
										<div class="text-sm text-[var(--color-text-primary)] mt-1">
											{versionMeta.commitMessage}
										</div>
									</div>
								</div>

								<!-- Summary Badge (if diff loaded) -->
								{#if versionDiffs.has(versionMeta.version)}
									{@const diff = versionDiffs.get(versionMeta.version)}
									{#if diff}
										<div class="flex items-center gap-2 text-sm">
											{#if diff.added.length > 0}
												<span class="text-[var(--color-success)]">
													+{diff.added.reduce((sum, c) => sum + (c.quantityDelta || 0), 0)}
												</span>
											{/if}
											{#if diff.removed.length > 0}
												<span class="text-[var(--color-error)]">
													-{diff.removed.reduce(
														(sum, c) => sum + Math.abs(c.quantityDelta || 0),
														0
													)}
												</span>
											{/if}
											{#if diff.modified.length > 0}
												<span class="text-[var(--color-warning)]">
													~{diff.modified.length}
												</span>
											{/if}
										</div>
									{/if}
								{/if}
							</button>

							<!-- Accordion Content -->
							{#if openVersions.has(versionMeta.version)}
								<div class="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
									{#if loadingDiffs.has(versionMeta.version)}
										<div class="text-center text-[var(--color-text-secondary)] py-4">
											Loading diff...
										</div>
									{:else if versionDiffs.get(versionMeta.version)}
										{@const diff = versionDiffs.get(versionMeta.version)}
										{#if diff}
											<div class="space-y-3 font-mono text-sm">
												<!-- Added Cards -->
												{#if diff.added.length > 0}
													<div>
														<div class="font-semibold text-[var(--color-success)] mb-1">
															Added ({diff.added.reduce(
																(sum, c) => sum + (c.quantityDelta || 0),
																0
															)} cards):
														</div>
														{#each diff.added as card}
															<div class="text-[var(--color-success)] pl-4">
																+ {card.quantityDelta}x {card.name}
																{#if card.setCode}
																	<span class="text-[var(--color-text-tertiary)]">
																		[{card.setCode.toUpperCase()}]
																	</span>
																{/if}
															</div>
														{/each}
													</div>
												{/if}

												<!-- Removed Cards -->
												{#if diff.removed.length > 0}
													<div>
														<div class="font-semibold text-[var(--color-error)] mb-1">
															Removed ({diff.removed.reduce(
																(sum, c) => sum + Math.abs(c.quantityDelta || 0),
																0
															)} cards):
														</div>
														{#each diff.removed as card}
															<div class="text-[var(--color-error)] pl-4">
																- {card.oldQuantity}x {card.name}
																{#if card.setCode}
																	<span class="text-[var(--color-text-tertiary)]">
																		[{card.setCode.toUpperCase()}]
																	</span>
																{/if}
															</div>
														{/each}
													</div>
												{/if}

												<!-- Modified Cards -->
												{#if diff.modified.length > 0}
													<div>
														<div class="font-semibold text-[var(--color-warning)] mb-1">
															Modified ({diff.modified.length} cards):
														</div>
														{#each diff.modified as card}
															<div class="text-[var(--color-warning)] pl-4">
																~ {card.oldQuantity}x → {card.newQuantity}x {card.name}
																{#if card.setCode}
																	<span class="text-[var(--color-text-tertiary)]">
																		[{card.setCode.toUpperCase()}]
																	</span>
																{/if}
																<span class="text-[var(--color-text-secondary)]">
																	({card.quantityDelta && card.quantityDelta > 0 ? '+' : ''}{card.quantityDelta})
																</span>
															</div>
														{/each}
													</div>
												{/if}

												<!-- No Changes -->
												{#if diff.totalChanges === 0}
													<div class="text-[var(--color-text-secondary)] text-center py-2">
														No changes
													</div>
												{/if}
											</div>
										{:else}
											<div class="text-[var(--color-text-secondary)] text-center py-4">
												Failed to load diff
											</div>
										{/if}
									{:else}
										<div class="text-[var(--color-text-secondary)] text-center py-4">
											Click to load diff
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end">
			<button
				onclick={onClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium"
			>
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>
