<script lang="ts">
	import { deckManager } from '$lib/stores/deck-manager';
	import { calculateDiff, calculatePriceDiff, formatDiffSummary } from '$lib/utils/diff';
	import type { Deck } from '$lib/types/deck';
	import type { VersionDiff } from '$lib/types/version';

	let {
		isOpen = false,
		currentVersion = '1.0.0',
		onClose = () => {}
	}: {
		isOpen?: boolean;
		currentVersion?: string;
		onClose?: () => void;
	} = $props();

	// Get available versions from deck manager
	let availableVersions = $derived(
		$deckManager.activeManifest?.branches
			?.find(b => b.name === ($deckManager.activeDeck?.currentBranch || 'main'))
			?.versions?.map(v => v.version) || []
	);

	// Selected versions
	let fromVersion = $state(availableVersions[1] || '1.0.0');
	let toVersion = $state(currentVersion);

	// Loading state
	let loading = $state(false);
	let diff: VersionDiff | null = $state(null);
	let priceDiff = $state(0);

	// Load and compare versions
	async function loadComparison() {
		if (!$deckManager.activeDeckName || !fromVersion || !toVersion) return;

		loading = true;
		try {
			// Load both versions
			const fromDeck = await deckManager.loadVersionData(fromVersion);
			const toDeck = await deckManager.loadVersionData(toVersion);

			if (fromDeck && toDeck) {
				diff = calculateDiff(fromDeck, toDeck);
				priceDiff = calculatePriceDiff(diff);
			}
		} catch (error) {
			console.error('Failed to load version comparison:', error);
		} finally {
			loading = false;
		}
	}

	// Auto-load comparison when versions change
	$effect(() => {
		if (isOpen && fromVersion && toVersion) {
			loadComparison();
		}
	});

	function handleClose() {
		diff = null;
		priceDiff = 0;
		onClose();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-3xl w-full mx-4 border border-[var(--color-border)] max-h-[80vh] flex flex-col"
			onclick={(e) => e.stopPropagation()}
			onkeydown={undefined}
			role="dialog"
			aria-modal="true"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Compare Versions</h2>
			</div>

			<!-- Version Selectors -->
			<div class="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-4">
				<div class="flex-1">
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						From Version
					</label>
					<select
						bind:value={fromVersion}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each availableVersions as version}
							<option value={version}>{version}</option>
						{/each}
					</select>
				</div>

				<div class="pt-6 text-[var(--color-text-secondary)]">→</div>

				<div class="flex-1">
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						To Version
					</label>
					<select
						bind:value={toVersion}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each availableVersions as version}
							<option value={version}>{version}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 overflow-y-auto flex-1">
				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="text-[var(--color-text-primary)] mb-2">Loading comparison...</div>
						</div>
					</div>
				{:else if diff}
					<!-- Summary -->
					<div class="mb-6 p-4 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
						<div class="flex items-center justify-between">
							<div class="text-lg font-semibold text-[var(--color-text-primary)]">
								{formatDiffSummary(diff)}
							</div>
							<div class="text-lg font-semibold {priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}">
								{priceDiff >= 0 ? '+' : ''}{priceDiff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</div>
						</div>
					</div>

					<!-- Added Cards -->
					{#if diff.added.length > 0}
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-green-500 mb-3 flex items-center gap-2">
								<span>+</span> Added Cards ({diff.added.reduce((sum, c) => sum + (c.quantityDelta || 0), 0)})
							</h3>
							<div class="space-y-2">
								{#each diff.added as card}
									<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded border-l-2 border-green-500">
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
												+{card.quantityDelta}
											</span>
											<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
										</div>
										{#if card.price}
											<span class="text-sm text-green-500">
												${(card.price * (card.quantityDelta || 0)).toFixed(2)}
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Removed Cards -->
					{#if diff.removed.length > 0}
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-red-500 mb-3 flex items-center gap-2">
								<span>-</span> Removed Cards ({diff.removed.reduce((sum, c) => sum + Math.abs(c.quantityDelta || 0), 0)})
							</h3>
							<div class="space-y-2">
								{#each diff.removed as card}
									<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded border-l-2 border-red-500">
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
												{card.quantityDelta}
											</span>
											<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
										</div>
										{#if card.price}
											<span class="text-sm text-red-500">
												${(card.price * (card.quantityDelta || 0)).toFixed(2)}
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Modified Cards -->
					{#if diff.modified.length > 0}
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-yellow-500 mb-3 flex items-center gap-2">
								<span>~</span> Modified Cards ({diff.modified.length})
							</h3>
							<div class="space-y-2">
								{#each diff.modified as card}
									<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded border-l-2 border-yellow-500">
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
												{card.quantityDelta && card.quantityDelta > 0 ? '+' : ''}{card.quantityDelta}
											</span>
											<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
											<span class="text-xs text-[var(--color-text-tertiary)]">
												({card.oldQuantity} → {card.newQuantity})
											</span>
										</div>
										{#if card.price && card.quantityDelta}
											<span class="text-sm {card.quantityDelta > 0 ? 'text-green-500' : 'text-red-500'}">
												{card.quantityDelta > 0 ? '+' : ''}${(card.price * card.quantityDelta).toFixed(2)}
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{:else}
					<div class="text-center py-12 text-[var(--color-text-secondary)]">
						Select two versions to compare
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
				<button
					onclick={handleClose}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
