<script lang="ts">
	import { deckStore, validationWarnings } from '$lib/stores/deck-store';
	import { deckManager } from '$lib/stores/deck-manager';
	import { toastStore } from '$lib/stores/toast-store';
	import { CardCategory } from '$lib/types/card';
	import type { Deck } from '$lib/types/deck';
	import type { DeckSaltScore } from '$lib/types/edhrec';
	import { DeckFormat } from '$lib/formats/format-registry';
	import ManaSymbolIcon from './ManaSymbolIcon.svelte';
	import ValidationWarningIcon from './ValidationWarningIcon.svelte';
	import { getBracketLabel, isGameChanger } from '$lib/utils/game-changers';
	import BracketTooltip from './BracketTooltip.svelte';
	import SaltTooltip from './SaltTooltip.svelte';
	import { calculateDeckSaltScore } from '$lib/utils/salt-calculator';

	// Store subscriptions using Svelte 5 runes
	let deckStoreState = $state($deckStore);
	let validationWarningsState = $state($validationWarnings);
	let deckManagerState = $state($deckManager);

	$effect(() => {
		const unsubscribeDeckStore = deckStore.subscribe((value) => {
			deckStoreState = value;
		});
		const unsubscribeValidations = validationWarnings.subscribe((value) => {
			validationWarningsState = value;
		});
		const unsubscribeDeckManager = deckManager.subscribe((value) => {
			deckManagerState = value;
		});
		return () => {
			unsubscribeDeckStore();
			unsubscribeValidations();
			unsubscribeDeckManager();
		};
	});

	// Derived values
	let deck = $derived(deckStoreState?.deck);
	let statistics = $derived(deckStoreState?.statistics);
	let commander = $derived(deck?.cards.commander?.[0]);
	let commanderImageUrl = $derived(commander?.imageUrls?.artCrop || commander?.imageUrls?.large);
	let bracketLabel = $derived(
		statistics?.bracketLevel ? getBracketLabel(statistics.bracketLevel) : 'Unknown'
	);
	let isCommanderFormat = $derived(deck?.format === DeckFormat.Commander);
	let gameChangersInDeck = $derived(isCommanderFormat && deck ? getAllGameChangers(deck) : []);
	let deckWideWarnings = $derived(validationWarningsState.filter((w) => !w.cardName));
	let typeDistribution = $derived({
		planeswalker:
			deck?.cards[CardCategory.Planeswalker]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		creature: deck?.cards[CardCategory.Creature]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		instant: deck?.cards[CardCategory.Instant]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		sorcery: deck?.cards[CardCategory.Sorcery]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		artifact: deck?.cards[CardCategory.Artifact]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		enchantment:
			deck?.cards[CardCategory.Enchantment]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		land: deck?.cards[CardCategory.Land]?.reduce((sum, c) => sum + c.quantity, 0) || 0
	});
	let mainDeckCount = $derived(statistics?.totalCards || 0);

	// Salt score state
	let saltScore = $state<DeckSaltScore | null>(null);
	let saltLoading = $state(false);

	// Fetch salt score when deck changes (Commander format only)
	$effect(() => {
		if (isCommanderFormat && deck) {
			loadSaltScore(deck);
		} else {
			saltScore = null;
		}
	});

	async function loadSaltScore(currentDeck: Deck) {
		saltLoading = true;
		try {
			saltScore = await calculateDeckSaltScore(currentDeck);
		} catch (error) {
			console.warn('Failed to load salt score:', error);
			saltScore = null;
		} finally {
			saltLoading = false;
		}
	}

	function getAllGameChangers(deck: Deck | undefined): string[] {
		if (!deck) return [];
		const gameChangers: string[] = [];
		for (const category of Object.keys(deck.cards) as (keyof typeof deck.cards)[]) {
			for (const card of deck.cards[category]) {
				if (isGameChanger(card.name)) {
					gameChangers.push(card.name);
				}
			}
		}
		return gameChangers.sort();
	}

	// Inline editing state
	let isEditingName = $state(false);
	let editedName = $state('');
	let nameInputElement = $state<HTMLInputElement | undefined>(undefined);

	function startEditingName() {
		if (!deck) return;
		editedName = deck.name;
		isEditingName = true;
		setTimeout(() => nameInputElement?.focus(), 0);
	}

	function cancelEditingName() {
		isEditingName = false;
		editedName = '';
	}

	async function saveEditedName() {
		if (!deck || !editedName.trim() || editedName === deck.name) {
			cancelEditingName();
			return;
		}

		const newName = editedName.trim();

		// Check for name collision
		const existingDecks = deckManagerState.decks;
		if (existingDecks.some((d) => d.name === newName)) {
			toastStore.error(
				'A deck with this name already exists. Please choose a different name.'
			);
			return;
		}

		// Rename the deck
		await deckManager.renameDeck(deck.name, newName);
		deckStore.setDeckName(newName);

		isEditingName = false;
		editedName = '';
	}

	function handleNameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveEditedName();
		} else if (event.key === 'Escape') {
			cancelEditingName();
		}
	}
</script>

<!-- Compact Header -->
<div class="h-28 flex-shrink-0 border-b border-[var(--color-border)]">
	<div class="relative h-full overflow-hidden">
		<!-- Solid black background -->
		<div class="absolute inset-0 bg-black"></div>

		<!-- Commander Art Background (blurred and faded) - Only for Commander format -->
		{#if commanderImageUrl && isCommanderFormat}
			<div
				class="absolute inset-0 bg-cover"
				style="background-image: url('{commanderImageUrl}'); background-position: center 60%; filter: blur(6px) brightness(0.6); opacity: 0.8; transform: scale(1.05);"
			></div>
		{/if}

		<!-- Solid background overlay -->
		<div class="absolute inset-0 bg-[var(--color-bg-secondary)]/30 backdrop-blur-sm"></div>

		<!-- Content -->
		<div class="relative h-full px-6 flex items-center justify-between">
			<!-- Left: Deck Info -->
			<div class="min-w-[300px]">
				<!-- Deck Name with Inline Editing - Fixed height container to prevent layout shift -->
				<div class="group flex items-center gap-2 h-8 mb-2">
					{#if isEditingName}
						<!-- Editing Mode -->
						<input
							bind:this={nameInputElement}
							bind:value={editedName}
							onkeydown={handleNameKeydown}
							onblur={saveEditedName}
							class="text-lg text-[var(--color-text-primary)] font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-brand-primary)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] w-full max-w-[400px] h-8"
							type="text"
						/>
					{:else}
						<!-- Display Mode -->
						<h1 class="text-lg text-[var(--color-text-primary)] font-semibold leading-8">
							{deck?.name || 'Untitled Deck'}
						</h1>
						<!-- Always render button to prevent layout shift -->
						<button
							onclick={startEditingName}
							class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-surface-hover)] rounded {!deck
								? 'invisible'
								: ''}"
							title="Rename deck"
						>
							<svg
								class="w-4 h-4 text-[var(--color-text-secondary)]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
								/>
							</svg>
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
					<div class="flex items-center gap-2">
						<span class="font-semibold">{mainDeckCount}</span> cards
						<!-- Deck-wide validation warnings -->
						{#each deckWideWarnings as warning}
							<ValidationWarningIcon {warning} position="below" />
						{/each}
					</div>
					<!-- Bracket Level - Only for Commander -->
					{#if isCommanderFormat && deck && statistics?.bracketLevel}
						<div class="flex items-center gap-2">
							<span class="text-[var(--color-text-tertiary)]">Bracket:</span>
							<BracketTooltip
								{deck}
								bracketLevel={statistics.bracketLevel}
								gameChangers={gameChangersInDeck}
								twoCardComboCount={statistics?.twoCardComboCount ?? 0}
								earlyGameComboCount={statistics?.earlyGameComboCount ?? 0}
								lateGameComboCount={statistics?.lateGameComboCount ?? 0}
								hasMassLandDenial={statistics?.hasMassLandDenial ?? false}
								hasExtraTurns={statistics?.hasExtraTurns ?? false}
								hasChainingExtraTurns={statistics?.hasChainingExtraTurns ?? false}
							>
								<span
									class="font-semibold px-2 py-0.5 rounded text-xs cursor-help {statistics.bracketLevel ===
									1
										? 'bg-green-500/20 text-green-400'
										: statistics.bracketLevel === 2
											? 'bg-blue-500/20 text-blue-400'
											: statistics.bracketLevel === 3
												? 'bg-yellow-500/20 text-yellow-400'
												: statistics.bracketLevel === 4
													? 'bg-orange-500/20 text-orange-400'
													: 'bg-red-500/20 text-red-400'}"
								>
									{statistics.bracketLevel} - {bracketLabel}
								</span>
							</BracketTooltip>
						</div>
					{/if}
					<!-- Salt Score - Only for Commander -->
					{#if isCommanderFormat && deck}
						<div class="flex items-center gap-2">
							<span class="text-[var(--color-text-tertiary)]">Salt:</span>
							<SaltTooltip {saltScore} loading={saltLoading}>
								{#if saltScore && saltScore.totalCardsWithScores > 0}
									<div class="flex items-center gap-1.5">
										<span
											class="font-semibold px-2 py-0.5 rounded text-xs cursor-help {saltScore.averageSalt >=
											2.5
												? 'bg-red-500/20 text-red-400'
												: saltScore.averageSalt >= 2.0
													? 'bg-orange-500/20 text-orange-400'
													: saltScore.averageSalt >= 1.5
														? 'bg-yellow-500/20 text-yellow-400'
														: 'bg-green-500/20 text-green-400'}"
										>
											{saltScore.totalSalt.toFixed(1)}
										</span>
										{#if saltLoading}
											<svg
												class="animate-spin h-3 w-3 text-[var(--color-text-tertiary)]"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
										{/if}
									</div>
								{:else if saltLoading}
									<div class="flex items-center gap-1.5">
										<span class="text-xs text-[var(--color-text-secondary)]">Calculating...</span>
										<svg
											class="animate-spin h-3 w-3 text-[var(--color-text-tertiary)]"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									</div>
								{:else}
									<span class="text-xs text-[var(--color-text-secondary)]">N/A</span>
								{/if}
							</SaltTooltip>
						</div>
					{/if}
				</div>
			</div>

			<!-- Center: Stats -->
			<div
				class="flex items-center justify-center gap-6 text-[var(--color-text-primary)] flex-1"
			>
				<!-- Type Distribution -->
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-1" title="Planeswalkers">
						<ManaSymbolIcon type="planeswalker" />
						<span class="text-sm font-medium">{typeDistribution.planeswalker}</span>
					</div>
					<div class="flex items-center gap-1" title="Creatures">
						<ManaSymbolIcon type="creature" />
						<span class="text-sm font-medium">{typeDistribution.creature}</span>
					</div>
					<div class="flex items-center gap-1" title="Instants">
						<ManaSymbolIcon type="instant" />
						<span class="text-sm font-medium">{typeDistribution.instant}</span>
					</div>
					<div class="flex items-center gap-1" title="Sorceries">
						<ManaSymbolIcon type="sorcery" />
						<span class="text-sm font-medium">{typeDistribution.sorcery}</span>
					</div>
					<div class="flex items-center gap-1" title="Artifacts">
						<ManaSymbolIcon type="artifact" />
						<span class="text-sm font-medium">{typeDistribution.artifact}</span>
					</div>
					<div class="flex items-center gap-1" title="Enchantments">
						<ManaSymbolIcon type="enchantment" />
						<span class="text-sm font-medium">{typeDistribution.enchantment}</span>
					</div>
					<div class="flex items-center gap-1" title="Lands">
						<ManaSymbolIcon type="land" />
						<span class="text-sm font-medium">{typeDistribution.land}</span>
					</div>
				</div>
			</div>

			<!-- Right: Price -->
			<div class="text-right">
				<div class="text-sm text-[var(--color-text-secondary)] mb-1">Estimated Cost:</div>
				<div class="font-bold text-lg text-green-500">
					${statistics?.totalPrice?.toLocaleString('en-US', {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2
					}) || '0.00'}
				</div>
			</div>
		</div>
	</div>
</div>
