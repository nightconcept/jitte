<script lang="ts">
	import { deckManager } from '$lib/stores/deck-manager';
	import { calculateDiff, calculatePriceDiff, formatDiffSummary } from '$lib/utils/diff';
	import type { Deck } from '$lib/types/deck';
	import type { Card } from '$lib/types/card';
	import type { VersionDiff, DiffCard } from '$lib/types/version';
	import { toastStore } from '$lib/stores/toast-store';
	import BaseModal from './BaseModal.svelte';

	let {
		isOpen = false,
		currentVersion = '1.0.0',
		currentBranch = 'main',
		currentDeck = undefined,
		onClose = () => {}
	}: {
		isOpen?: boolean;
		currentVersion?: string;
		currentBranch?: string;
		currentDeck?: Deck | undefined;
		onClose?: () => void;
	} = $props();

	// Mode: 'compare' for version comparison, 'current' for current deck
	type BuylistMode = 'compare' | 'current';
	let mode = $state<BuylistMode>('compare');

	// Get available branches
	let availableBranches = $derived(
		$deckManager.activeManifest?.branches?.map(b => b.name) || []
	);

	// Selected branches
	let fromBranch = $state(currentBranch);
	let toBranch = $state(currentBranch);

	// Get available versions for selected branches
	let fromVersions = $derived(
		$deckManager.activeManifest?.branches
			?.find(b => b.name === fromBranch)
			?.versions?.map(v => v.version) || []
	);

	let toVersions = $derived(
		$deckManager.activeManifest?.branches
			?.find(b => b.name === toBranch)
			?.versions?.map(v => v.version) || []
	);

	// Selected versions
	let fromVersion = $state('1.0.0');
	let toVersion = $state(currentVersion);

	// Track whether user has manually modified the selections
	let userHasModified = $state(false);

	// Track previous isOpen state to detect when modal is opened
	let wasOpen = $state(false);

	/**
	 * Find the best default "from" version to compare against current version
	 * 1. Try same branch, previous version
	 * 2. Fallback to latest version from any branch with timestamp before current
	 */
	function getDefaultFromVersion(): { branch: string; version: string } {
		const manifest = $deckManager.activeManifest;
		if (!manifest) return { branch: currentBranch, version: '1.0.0' };

		// Find current branch and version metadata
		const currentBranchMeta = manifest.branches.find(b => b.name === currentBranch);
		if (!currentBranchMeta) return { branch: currentBranch, version: '1.0.0' };

		const currentVersionMeta = currentBranchMeta.versions.find(v => v.version === currentVersion);
		const currentTimestamp = currentVersionMeta?.timestamp;

		// Try same branch, previous version
		const currentVersionIndex = currentBranchMeta.versions.findIndex(v => v.version === currentVersion);
		if (currentVersionIndex > 0) {
			// There's a previous version on the same branch
			return {
				branch: currentBranch,
				version: currentBranchMeta.versions[currentVersionIndex - 1].version
			};
		}

		// Fallback: find latest version from any branch before current timestamp
		if (currentTimestamp) {
			let latestBeforeCurrent: { branch: string; version: string; timestamp: string } | null = null;

			for (const branch of manifest.branches) {
				for (const versionMeta of branch.versions) {
					if (versionMeta.timestamp < currentTimestamp) {
						if (!latestBeforeCurrent || versionMeta.timestamp > latestBeforeCurrent.timestamp) {
							latestBeforeCurrent = {
								branch: branch.name,
								version: versionMeta.version,
								timestamp: versionMeta.timestamp
							};
						}
					}
				}
			}

			if (latestBeforeCurrent) {
				return {
					branch: latestBeforeCurrent.branch,
					version: latestBeforeCurrent.version
				};
			}
		}

		// Final fallback: first version on current branch
		return {
			branch: currentBranch,
			version: currentBranchMeta.versions[0]?.version || '1.0.0'
		};
	}

	// Initialize default selections when modal opens
	$effect(() => {
		// Detect when modal is opened (transition from closed to open)
		if (isOpen && !wasOpen && !userHasModified) {
			// Reset to intelligent defaults
			const defaultFrom = getDefaultFromVersion();
			fromBranch = defaultFrom.branch;
			fromVersion = defaultFrom.version;
			toBranch = currentBranch;
			toVersion = currentVersion;
		}
		wasOpen = isOpen;
	});

	// Update selected versions when branches change (but respect user modifications)
	$effect(() => {
		if (fromVersions.length > 0 && userHasModified) {
			// When user changes branch, select first version
			if (!fromVersions.includes(fromVersion)) {
				fromVersion = fromVersions[0];
			}
		}
	});

	$effect(() => {
		if (toVersions.length > 0 && userHasModified) {
			// When user changes branch, select appropriate version
			if (!toVersions.includes(toVersion)) {
				if (toBranch === currentBranch) {
					toVersion = currentVersion;
				} else {
					toVersion = toVersions[toVersions.length - 1];
				}
			}
		}
	});

	// Loading state
	let loading = $state(false);
	let diff: VersionDiff | null = $state(null);
	let priceDiff = $state(0);

	// Proxy shopping state
	let proxyShoppingEnabled = $state(false);
	let selectedPreset = $state<number | 'custom'>(5);
	let customThreshold = $state('5.00');
	let selectedProxyCostPreset = $state<number | 'custom'>(1);
	let customProxyCost = $state('1.00');

	// Derived price threshold
	let priceThreshold = $derived(
		selectedPreset === 'custom' ? parseFloat(customThreshold) || 0 : selectedPreset
	);

	// Derived proxy cost per card
	let proxyCostPerCard = $derived(
		selectedProxyCostPreset === 'custom' ? parseFloat(customProxyCost) || 1 : selectedProxyCostPreset
	);

	// Helper to get quantity from either Card or DiffCard
	function getCardQuantity(card: Card | DiffCard): number {
		if (mode === 'compare') {
			// DiffCard
			const diffCard = card as DiffCard;
			return diffCard.quantityDelta || diffCard.newQuantity || 1;
		} else {
			// Card
			const normalCard = card as Card;
			return normalCard.quantity || 1;
		}
	}

	// Cards to split between shopping and proxy lists
	let cardsToSplit = $derived(() => {
		if (!proxyShoppingEnabled) return [];

		if (mode === 'compare' && diff) {
			const cards: DiffCard[] = [...diff.added];
			for (const card of diff.modified) {
				if (card.quantityDelta && card.quantityDelta > 0) {
					cards.push(card);
				}
			}
			return cards;
		} else if (mode === 'current' && currentDeck) {
			// Flatten all cards from all categories
			const allCards: Card[] = [];
			for (const category of Object.values(currentDeck.cards)) {
				allCards.push(...category);
			}
			return allCards;
		}
		return [];
	});

	// Shopping list: cards <= threshold with pricing data
	let shoppingListCards = $derived(() => {
		return cardsToSplit()
			.filter(card => {
				const price = card.price;
				// Cards without price go to proxy list
				if (price === undefined || price === null) return false;
				return price <= priceThreshold;
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	// Proxy list: cards > threshold OR without pricing data
	let proxyListCards = $derived(() => {
		return cardsToSplit()
			.filter(card => {
				const price = card.price;
				// Cards without price go to proxy list (usually expensive)
				if (price === undefined || price === null) return true;
				return price > priceThreshold;
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	// Calculate totals
	let shoppingListTotal = $derived(() => {
		return shoppingListCards().reduce((sum, card) => {
			const quantity = getCardQuantity(card);
			return sum + (card.price || 0) * quantity;
		}, 0);
	});

	let proxyListTotal = $derived(() => {
		return proxyListCards().reduce((sum, card) => {
			const quantity = getCardQuantity(card);
			return sum + (card.price || 0) * quantity;
		}, 0);
	});

	let proxyListCardCount = $derived(() => {
		return proxyListCards().reduce((sum, card) => {
			const quantity = getCardQuantity(card);
			return sum + quantity;
		}, 0);
	});

	// Estimated proxy cost (MakePlayingCards/PrintingProxies): using user-selected cost per card
	let estimatedProxyCost = $derived(() => {
		return proxyListCardCount() * proxyCostPerCard;
	});

	let totalSavings = $derived(() => {
		return proxyListTotal() - estimatedProxyCost();
	});

	// Load and compare versions
	async function loadComparison() {
		if (!$deckManager.activeDeckName || !fromVersion || !toVersion) return;

		loading = true;
		try {
			// Load both versions from potentially different branches
			const fromDeck = await deckManager.loadVersionData(fromVersion, fromBranch);
			const toDeck = await deckManager.loadVersionData(toVersion, toBranch);

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

	// Auto-load comparison when versions or branches change
	$effect(() => {
		if (isOpen && mode === 'compare' && fromVersion && toVersion && fromBranch && toBranch) {
			loadComparison();
		}
	});

	/**
	 * Generate a plaintext buylist from the diff or current deck
	 * Format: quantity + card name only (no set codes)
	 */
	function generateBuylistText(): string {
		if (mode === 'current') {
			// Generate buylist from current deck
			if (!currentDeck) return '';

			const allCards: { name: string; quantity: number }[] = [];

			// Collect all cards from all categories
			for (const category of Object.values(currentDeck.cards)) {
				for (const card of category) {
					allCards.push({ name: card.name, quantity: card.quantity });
				}
			}

			// Sort alphabetically
			allCards.sort((a, b) => a.name.localeCompare(b.name));

			// Format as "quantity cardname"
			return allCards.map(card => `${card.quantity} ${card.name}`).join('\n');
		} else {
			// Generate buylist from diff (compare mode)
			if (!diff) return '';

			const buylistCards: DiffCard[] = [];

			// Include all added cards
			buylistCards.push(...diff.added);

			// Include cards with positive quantity changes
			for (const card of diff.modified) {
				if (card.quantityDelta && card.quantityDelta > 0) {
					buylistCards.push(card);
				}
			}

			// Sort by name alphabetically
			buylistCards.sort((a, b) => a.name.localeCompare(b.name));

			// Format as "quantity cardname"
			return buylistCards
				.map(card => `${card.quantityDelta || card.newQuantity || 1} ${card.name}`)
				.join('\n');
		}
	}

	/**
	 * Copy the buylist to clipboard
	 */
	async function copyBuylist() {
		const buylistText = generateBuylistText();

		if (!buylistText) {
			toastStore.warning('No cards to copy');
			return;
		}

		try {
			await navigator.clipboard.writeText(buylistText);
			toastStore.success(`Copied ${buylistText.split('\n').length} cards to clipboard`);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			toastStore.error('Failed to copy to clipboard');
		}
	}

	/**
	 * Copy the shopping list to clipboard (for TCGPlayer, etc.)
	 */
	async function copyShoppingList() {
		const cards = shoppingListCards();
		if (cards.length === 0) {
			toastStore.warning('No cards in shopping list');
			return;
		}

		const buylistText = cards
			.map(card => {
				const quantity = getCardQuantity(card);
				return `${quantity} ${card.name}`;
			})
			.join('\n');

		try {
			await navigator.clipboard.writeText(buylistText);
			toastStore.success(`Copied ${cards.length} cards to clipboard for shopping`);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			toastStore.error('Failed to copy to clipboard');
		}
	}

	/**
	 * Copy the proxy list to clipboard
	 */
	async function copyProxyList() {
		const cards = proxyListCards();
		if (cards.length === 0) {
			toastStore.warning('No cards in proxy list');
			return;
		}

		const proxyText = cards
			.map(card => {
				const quantity = getCardQuantity(card);
				return `${quantity} ${card.name}`;
			})
			.join('\n');

		try {
			await navigator.clipboard.writeText(proxyText);
			toastStore.success(`Copied ${cards.length} cards to clipboard for proxying`);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			toastStore.error('Failed to copy to clipboard');
		}
	}

	function handleClose() {
		diff = null;
		priceDiff = 0;
		// Reset user modification flag so next time modal opens, it uses smart defaults
		userHasModified = false;
		onClose();
	}

	/**
	 * Mark that user has manually changed selections
	 */
	function handleUserChange() {
		userHasModified = true;
	}
</script>

<BaseModal
	{isOpen}
	onClose={handleClose}
	title="Buylist"
	size="3xl"
	height="max-h-[80vh]"
	contentClass="flex flex-col"
>
	{#snippet children()}
		<!-- Mode Selector -->
		<div class="px-6 py-4 border-b border-[var(--color-border)]">
			<div class="flex items-center gap-4">
				<span class="text-sm font-medium text-[var(--color-text-primary)]">Mode:</span>
				<div class="flex gap-2">
					<button
						onclick={() => mode = 'current'}
						class="px-4 py-2 text-sm rounded border {mode === 'current'
							? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
							: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
					>
						Current Deck
					</button>
					<button
						onclick={() => mode = 'compare'}
						class="px-4 py-2 text-sm rounded border {mode === 'compare'
							? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
							: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
					>
						Compare Versions
					</button>
				</div>
			</div>
		</div>

		<!-- Version Selectors (Compare Mode Only) -->
		{#if mode === 'compare'}
		<div class="px-6 py-4 border-b border-[var(--color-border)] grid grid-cols-[1fr_auto_1fr] gap-4">
			<!-- From Side -->
			<div class="space-y-3">
				<div>
					<label for="from-branch-select" class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Starting Branch
					</label>
					<select
						id="from-branch-select"
						bind:value={fromBranch}
						onchange={handleUserChange}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each availableBranches as branch}
							<option value={branch}>{branch}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="from-version-select" class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Starting Version
					</label>
					<select
						id="from-version-select"
						bind:value={fromVersion}
						onchange={handleUserChange}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each fromVersions as version}
							<option value={version}>{version}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Arrow -->
			<div class="flex items-center justify-center pt-8 text-[var(--color-text-secondary)]">→</div>

			<!-- To Side -->
			<div class="space-y-3">
				<div>
					<label for="to-branch-select" class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Final Branch
					</label>
					<select
						id="to-branch-select"
						bind:value={toBranch}
						onchange={handleUserChange}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each availableBranches as branch}
							<option value={branch}>{branch}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="to-version-select" class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Final Version
					</label>
					<select
						id="to-version-select"
						bind:value={toVersion}
						onchange={handleUserChange}
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					>
						{#each toVersions as version}
							<option value={version}>{version}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>
		{/if}

		<!-- Proxy Shopping Controls -->
		<div class="px-6 py-4 border-b border-[var(--color-border)] space-y-4">
			<!-- Enable Toggle -->
			<div class="flex items-center gap-3">
				<input
					type="checkbox"
					id="proxy-shopping-toggle"
					bind:checked={proxyShoppingEnabled}
					class="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary)]"
				/>
				<label for="proxy-shopping-toggle" class="text-sm font-medium text-[var(--color-text-primary)] cursor-pointer">
					Enable Proxy Shopping
				</label>
			</div>

			<!-- Threshold Selector -->
			{#if proxyShoppingEnabled}
				<div class="space-y-2">
					<label class="block text-sm font-medium text-[var(--color-text-primary)]">
						Price Threshold
					</label>
					<div class="flex items-center gap-2 flex-wrap">
						{#each [1, 1.5, 2, 5, 10] as preset}
							<button
								onclick={() => selectedPreset = preset}
								class="px-3 py-1.5 text-sm rounded border {selectedPreset === preset
									? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
									: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
							>
								${preset.toFixed(2)}
							</button>
						{/each}
						<button
							onclick={() => selectedPreset = 'custom'}
							class="px-3 py-1.5 text-sm rounded border {selectedPreset === 'custom'
								? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
								: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
						>
							Custom
						</button>
						{#if selectedPreset === 'custom'}
							<input
								type="number"
								bind:value={customThreshold}
								min="0.01"
								max="999.99"
								step="0.01"
								class="w-24 px-3 py-1.5 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
								placeholder="5.00"
							/>
						{/if}
					</div>
					<p class="text-xs text-[var(--color-text-secondary)]">
						Cards above ${priceThreshold.toFixed(2)} will be proxied. Cards without pricing data will be proxied (usually expensive).
					</p>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-[var(--color-text-primary)]">
						Proxy Cost Per Card
					</label>
					<div class="flex items-center gap-2 flex-wrap">
						{#each [1, 1.5, 2, 4] as preset}
							<button
								onclick={() => selectedProxyCostPreset = preset}
								class="px-3 py-1.5 text-sm rounded border {selectedProxyCostPreset === preset
									? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
									: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
							>
								${preset.toFixed(2)}
							</button>
						{/each}
						<button
							onclick={() => selectedProxyCostPreset = 'custom'}
							class="px-3 py-1.5 text-sm rounded border {selectedProxyCostPreset === 'custom'
								? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
								: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
						>
							Custom
						</button>
						{#if selectedProxyCostPreset === 'custom'}
							<input
								type="number"
								bind:value={customProxyCost}
								min="0.01"
								max="99.99"
								step="0.01"
								class="w-24 px-3 py-1.5 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
								placeholder="1.00"
							/>
						{/if}
					</div>
					<p class="text-xs text-[var(--color-text-secondary)]">
						Estimated cost per proxy card. Note: Consider shipping for both lists. Proxy shipping is usually cheaper (single vendor) vs. shopping list (potentially multiple vendors).
					</p>
				</div>
			{/if}
		</div>

		<!-- Body -->
		<div class="px-6 py-4 overflow-y-auto flex-1">
			{#if proxyShoppingEnabled && (mode === 'current' || (mode === 'compare' && diff))}
				<!-- Proxy Shopping View -->
				<div class="space-y-4">
					<!-- Summary with savings -->
					{#if totalSavings() > 0}
						<div class="p-4 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
							<div class="flex items-center justify-between">
								<div class="text-sm text-[var(--color-text-secondary)]">
									Total Savings by Proxying
								</div>
								<div class="text-xl font-bold text-green-500">
									${totalSavings().toFixed(2)}
								</div>
							</div>
							<div class="text-xs text-[var(--color-text-tertiary)] mt-1">
								Proxy cost estimate: ${estimatedProxyCost().toFixed(2)} ({proxyListCardCount()} cards @ ${proxyCostPerCard.toFixed(2)}/card)
							</div>
						</div>
					{/if}

					<!-- Two-column layout -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<!-- Shopping List -->
						<div class="space-y-3">
							<div class="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
								<h3 class="text-lg font-semibold text-green-500">Shopping List</h3>
								<div class="text-right">
									<div class="text-sm font-semibold text-green-500">
										{shoppingListCards().reduce((sum, card) => sum + getCardQuantity(card), 0)} cards
									</div>
									<div class="text-lg font-bold text-green-500">
										${shoppingListTotal().toFixed(2)}
									</div>
								</div>
							</div>

							<div class="space-y-2 max-h-96 overflow-y-auto">
								{#if shoppingListCards().length === 0}
									<div class="text-center py-8 text-[var(--color-text-secondary)] text-sm">
										No cards in shopping list
									</div>
								{:else}
									{#each shoppingListCards() as card}
										<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]">
											<div class="flex items-center gap-3">
												<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
													{getCardQuantity(card)}
												</span>
												<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
											</div>
											{#if card.price !== undefined && card.price !== null}
												<span class="text-sm text-green-500 font-medium">
													${(card.price * getCardQuantity(card)).toFixed(2)}
												</span>
											{/if}
										</div>
									{/each}
								{/if}
							</div>

							<p class="text-xs text-[var(--color-text-tertiary)] italic">
								Note: Shipping costs may vary by retailer
							</p>
						</div>

						<!-- Proxy List -->
						<div class="space-y-3">
							<div class="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
								<h3 class="text-lg font-semibold text-purple-500">Proxy List</h3>
								<div class="text-right">
									<div class="text-sm font-semibold text-purple-500">
										{proxyListCards().reduce((sum, card) => sum + getCardQuantity(card), 0)} cards
									</div>
									<div class="text-lg font-bold text-purple-500">
										${proxyListTotal().toFixed(2)}
									</div>
								</div>
							</div>

							<div class="space-y-2 max-h-96 overflow-y-auto">
								{#if proxyListCards().length === 0}
									<div class="text-center py-8 text-[var(--color-text-secondary)] text-sm">
										No cards in proxy list
									</div>
								{:else}
									{#each proxyListCards() as card}
										<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]">
											<div class="flex items-center gap-3">
												<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
													{getCardQuantity(card)}
												</span>
												<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
												{#if card.price === undefined || card.price === null}
													<span class="text-xs text-[var(--color-text-tertiary)] italic">(no price data)</span>
												{/if}
											</div>
											{#if card.price !== undefined && card.price !== null}
												<span class="text-sm text-purple-500 font-medium">
													${(card.price * getCardQuantity(card)).toFixed(2)}
												</span>
											{/if}
										</div>
									{/each}
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else if mode === 'current' && currentDeck}
				<!-- Current Deck Display -->
				<div class="mb-6 p-4 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
					<div class="flex items-center justify-between">
						<div class="text-lg font-semibold text-[var(--color-text-primary)]">
							{currentDeck.name} - {currentDeck.currentVersion}
						</div>
						<div class="text-lg font-semibold text-[var(--color-text-primary)]">
							{Object.values(currentDeck.cards).reduce(
								(sum, cat) => sum + cat.reduce((s: number, c: Card) => s + c.quantity, 0),
								0
							)} cards
						</div>
					</div>
				</div>

				<!-- All Cards List -->
				{#each Object.entries(currentDeck.cards) as [categoryName, categoryCards]}
					{#if categoryCards.length > 0}
						<div class="mb-6">
							<h3 class="text-lg font-semibold text-[var(--color-brand-primary)] mb-3 capitalize">
								{categoryName} ({categoryCards.reduce((sum: number, c: Card) => sum + c.quantity, 0)})
							</h3>
							<div class="space-y-2">
								{#each categoryCards as card}
									<div class="flex items-center justify-between py-2 px-3 bg-[var(--color-bg-primary)] rounded">
										<div class="flex items-center gap-3">
											<span class="text-sm font-semibold text-[var(--color-text-primary)] w-8">
												{card.quantity}
											</span>
											<span class="text-sm text-[var(--color-text-primary)]">{card.name}</span>
										</div>
										{#if card.price}
											<span class="text-sm text-[var(--color-text-secondary)]">
												${(card.price * card.quantity).toFixed(2)}
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			{:else if mode === 'compare' && loading}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="text-[var(--color-text-primary)] mb-2">Loading comparison...</div>
					</div>
				</div>
			{:else if mode === 'compare' && diff}
				<!-- Summary -->
				<div class="mb-6 p-4 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
					<div class="flex items-center justify-between">
						<div class="text-lg font-semibold text-[var(--color-text-primary)]">
							{formatDiffSummary(diff)}
						</div>
						<div class="text-lg font-semibold {priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}">
							{priceDiff >= 0 ? '+' : ''}${priceDiff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between">
			<div class="flex gap-2">
				{#if proxyShoppingEnabled}
					<button
						onclick={copyShoppingList}
						disabled={shoppingListCards().length === 0}
						class="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Copy Shopping List
					</button>
					<button
						onclick={copyProxyList}
						disabled={proxyListCards().length === 0}
						class="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Copy Proxy List
					</button>
				{:else}
					<button
						onclick={copyBuylist}
						disabled={mode === 'compare' ? (!diff || (diff.added.length === 0 && !diff.modified.some(c => c.quantityDelta && c.quantityDelta > 0))) : !currentDeck}
						class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Copy Buylist
					</button>
				{/if}
			</div>
			<button
				onclick={handleClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>
