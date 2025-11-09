<script lang="ts">
	import { deckStore, validationWarnings } from '$lib/stores/deck-store';
	import { deckManager } from '$lib/stores/deck-manager';
	import { toastStore } from '$lib/stores/toast-store';
	import { CardCategory } from '$lib/types/card';
	import type { Deck } from '$lib/types/deck';
	import ManaSymbolIcon from './ManaSymbolIcon.svelte';
	import ValidationWarningIcon from './ValidationWarningIcon.svelte';

	import { getBracketLabel, isGameChanger } from '$lib/utils/game-changers';
	import BracketTooltip from './BracketTooltip.svelte';

	$: deck = $deckStore?.deck;
	$: statistics = $deckStore?.statistics;
	$: commander = deck?.cards.commander?.[0];
	$: commanderImageUrl = commander?.imageUrls?.artCrop || commander?.imageUrls?.large;
	$: bracketLabel = statistics?.bracketLevel ? getBracketLabel(statistics.bracketLevel) : 'Unknown';

	// Get list of Game Changers in the deck
	$: gameChangersInDeck = deck ? getAllGameChangers(deck) : [];

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

	// Get deck-wide warnings (not specific to a card)
	$: deckWideWarnings = $validationWarnings.filter(w => !w.cardName);

	// Calculate type distribution
	$: typeDistribution = {
		planeswalker: deck?.cards[CardCategory.Planeswalker]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		creature: deck?.cards[CardCategory.Creature]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		instant: deck?.cards[CardCategory.Instant]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		sorcery: deck?.cards[CardCategory.Sorcery]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		artifact: deck?.cards[CardCategory.Artifact]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		enchantment: deck?.cards[CardCategory.Enchantment]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		land: deck?.cards[CardCategory.Land]?.reduce((sum, c) => sum + c.quantity, 0) || 0
	};

	$: mainDeckCount = statistics?.totalCards || 0;

	// Inline editing state
	let isEditingName = false;
	let editedName = '';
	let nameInputElement: HTMLInputElement;

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
		const existingDecks = $deckManager.decks;
		if (existingDecks.some(d => d.name === newName)) {
			toastStore.error('A deck with this name already exists. Please choose a different name.');
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

<!-- Compact Fixed Header -->
<div class="sticky top-[57px] z-40 h-20 flex-shrink-0 border-b border-[var(--color-border)]" style="transform: translateZ(0);">
	<div class="relative h-full overflow-hidden">
		<!-- Solid background -->
		<div class="absolute inset-0 bg-[var(--color-bg-secondary)]"></div>

		<!-- Content -->
		<div class="relative h-full px-6 flex items-center justify-between">
			<!-- Left: Deck Info -->
			<div class="min-w-[300px]">
				<!-- Deck Name with Inline Editing -->
				<div class="group flex items-center gap-2">
					{#if isEditingName}
						<!-- Editing Mode -->
						<input
							bind:this={nameInputElement}
							bind:value={editedName}
							on:keydown={handleNameKeydown}
							on:blur={saveEditedName}
							class="text-lg text-[var(--color-text-primary)] font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-brand-primary)] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] w-full max-w-[400px]"
							type="text"
						/>
					{:else}
						<!-- Display Mode -->
						<h1 class="text-lg text-[var(--color-text-primary)] font-semibold">
							{deck?.name || 'Untitled Deck'}
						</h1>
						<!-- Always render button to prevent layout shift -->
						<button
							on:click={startEditingName}
							class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-surface-hover)] rounded {!deck ? 'invisible' : ''}"
							title="Rename deck"
						>
							<svg class="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
					<div class="flex items-center gap-2">
						<span class="font-semibold">{mainDeckCount}</span> cards
						<!-- Deck-wide validation warnings -->
						{#each deckWideWarnings as warning}
							<ValidationWarningIcon {warning} position="right" />
						{/each}
					</div>
					<!-- Bracket Level -->
					{#if deck && statistics?.bracketLevel}
						<div class="flex items-center gap-2">
							<span class="text-[var(--color-text-tertiary)]">Bracket:</span>
							<BracketTooltip
								deck={deck}
								bracketLevel={statistics.bracketLevel}
								gameChangers={gameChangersInDeck}
							>
								<span
									class="font-semibold px-2 py-0.5 rounded text-xs cursor-help {statistics.bracketLevel === 1 ? 'bg-green-500/20 text-green-400' : statistics.bracketLevel === 2 ? 'bg-blue-500/20 text-blue-400' : statistics.bracketLevel === 3 ? 'bg-yellow-500/20 text-yellow-400' : statistics.bracketLevel === 4 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}"
								>
									{statistics.bracketLevel} - {bracketLabel}
								</span>
							</BracketTooltip>
						</div>
					{/if}
				</div>
			</div>

			<!-- Center: Stats -->
			<div class="flex items-center justify-center gap-6 text-[var(--color-text-primary)] flex-1">
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
					${statistics?.totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
				</div>
			</div>
		</div>
	</div>
</div>
