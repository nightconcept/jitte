<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import CardDisplay from './CardDisplay.svelte';
	import AddQuantityModal from './AddQuantityModal.svelte';
	import ChangePrintingModal from './ChangePrintingModal.svelte';
	import ChangeCommanderModal from './ChangeCommanderModal.svelte';
	import { deckStore } from '$lib/stores/deck-store';
	import { canAddPartner } from '$lib/utils/partner-detection';

	let {
		cards,
		category,
		categoryLabel,
		categoryIcon,
		isEditing = false,
		onCardClick = undefined,
		onCardHover = undefined,
		onDragStart = undefined,
		onDragEnd = undefined
	}: {
		cards: Card[];
		category: CardCategory;
		categoryLabel: string;
		categoryIcon: string;
		isEditing?: boolean;
		onCardClick?: (card: Card) => void;
		onCardHover?: (card: Card | null) => void;
		onDragStart?: (event: DragEvent, card: Card, category: CardCategory) => void;
		onDragEnd?: () => void;
	} = $props();

	// Store subscription
	let deckStoreState = $state($deckStore);

	$effect(() => {
		const unsubscribe = deckStore.subscribe(value => {
			deckStoreState = value;
		});
		return unsubscribe;
	});

	let deck = $derived(deckStoreState?.deck);

	// Card menu state
	let openCardMenu = $state<{ card: Card; x: number; y: number } | null>(null);
	let menuRef = $state<HTMLDivElement>();

	// Modal states
	let addMoreCard = $state<{ card: Card; category: CardCategory } | null>(null);
	let changePrintingCard = $state<{ card: Card; category: CardCategory } | null>(null);
	let isChangeCommanderModalOpen = $state(false);
	let commanderModalMode = $state<'replace_all' | 'replace_partner' | 'add_partner'>('replace_all');
	let commanderToReplaceIndex = $state<number>(0);

	function handleCardClick(card: Card) {
		onCardClick?.(card);
	}

	function handleCardRightClick(event: MouseEvent, card: Card) {
		if (!isEditing) return;
		event.preventDefault();
		event.stopPropagation();

		openCardMenu = {
			card,
			x: event.clientX,
			y: event.clientY
		};
	}

	function closeCardMenu() {
		openCardMenu = null;
	}

	function handleCardDragStart(event: DragEvent, card: Card) {
		if (!isEditing || category === CardCategory.Commander) return;
		onDragStart?.(event, card, category);
	}

	function handleCardDragEnd() {
		onDragEnd?.();
	}

	// Calculate total quantity for this category
	const totalQuantity = $derived(cards.reduce((sum, card) => sum + card.quantity, 0));

	// Calculate minimum height needed for the stack based on number of cards
	// Each card adds 38px offset (increased for readability), plus the base card height
	// Card width is ~200px at 1024px+, which gives ~280px height (5:7 aspect ratio)
	// Add 30px for pricing display + 30px buffer to show hovered card pricing fully
	// while heavily clipping pushed-down cards (minimal visibility)
	// Now showing one card per unique card instead of multiple copies
	const stackHeight = $derived(cards.length * 38 + 280 + 30 + 30);

	// Track which card is being hovered (by stack index)
	let hoveredStackIndex = $state<number | null>(null);

	function handleCardMouseEnter(stackIndex: number, card: Card) {
		hoveredStackIndex = stackIndex;
		onCardHover?.(card);
	}

	function handleCardMouseLeave() {
		hoveredStackIndex = null;
		onCardHover?.(null);
	}

	// Card menu actions
	function handleAddOne(card: Card) {
		deckStore.updateCardQuantity(card.name, category, 1);
		closeCardMenu();
	}

	function handleRemove(card: Card) {
		deckStore.removeCard(card.name, category);
		closeCardMenu();
	}

	function showAddMoreModal(card: Card) {
		addMoreCard = { card, category };
		closeCardMenu();
	}

	function showChangePrintingModal(card: Card) {
		changePrintingCard = { card, category };
		closeCardMenu();
	}

	function handleMoveToMaybeboard(card: Card) {
		deckStore.moveToMaybeboard(card.name, category);
		closeCardMenu();
	}

	function handleAddQuantity(quantity: number) {
		if (addMoreCard) {
			deckStore.updateCardQuantity(addMoreCard.card.name, addMoreCard.category, quantity);
			addMoreCard = null;
		}
	}

	function handleChangePrinting(newCard: Card) {
		if (changePrintingCard) {
			deckStore.switchPrinting(changePrintingCard.card.name, changePrintingCard.category, newCard);
			changePrintingCard = null;
		}
	}

	function showChangeCommanderModal(mode: 'replace_all' | 'replace_partner' | 'add_partner' = 'replace_all', index: number = 0) {
		commanderModalMode = mode;
		commanderToReplaceIndex = index;
		isChangeCommanderModalOpen = true;
		closeCardMenu();
	}

	function handleCommanderSelect(event: CustomEvent<Card>) {
		const newCommander = event.detail;

		if (commanderModalMode === 'replace_all') {
			deckStore.setCommanders([newCommander]);
		} else if (commanderModalMode === 'replace_partner') {
			deckStore.replaceCommander(commanderToReplaceIndex, newCommander);
		} else if (commanderModalMode === 'add_partner') {
			deckStore.addPartner(newCommander);
		}

		isChangeCommanderModalOpen = false;
	}

	function handleRemovePartner(commanderName: string) {
		deckStore.removePartner(commanderName);
		closeCardMenu();
	}

	function getCommanderIndex(commanderName: string): number {
		if (!deck) return -1;
		return deck.cards.commander.findIndex(c => c.name === commanderName);
	}

	// Click outside handler
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (openCardMenu && menuRef && !menuRef.contains(target)) {
				closeCardMenu();
			}
		}

		if (openCardMenu) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	});

	// Close menu on escape
	$effect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && openCardMenu) {
				closeCardMenu();
			}
		}

		if (openCardMenu) {
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	});
</script>

<div class="stacks-category">
	<!-- Category Header -->
	<div class="stacks-category-header">
		{#if categoryIcon}
			<i class="ms {categoryIcon} text-xl text-[var(--color-text-primary)]"></i>
		{/if}
		<h3 class="text-base font-bold text-[var(--color-brand-primary)]">
			{categoryLabel}
		</h3>
		<span class="text-xs text-[var(--color-text-tertiary)]">
			({totalQuantity})
		</span>
	</div>

	<!-- Card Stack -->
	<div class="stacks-container" style="min-height: {stackHeight}px;">
		{#each cards as card, cardIndex}
			{@const stackIndex = cardIndex}
			{@const shouldMoveDown = hoveredStackIndex !== null && stackIndex > hoveredStackIndex}

			<!-- Render one card per unique card (no copies) -->
			<div
				class="stacks-card"
				class:stacks-card-pushed={shouldMoveDown}
				style="--stack-index: {stackIndex}"
			>
				<div
					onclick={() => handleCardClick(card)}
					oncontextmenu={(e) => handleCardRightClick(e, card)}
					role="button"
					tabindex="0"
				>
					<CardDisplay
						{card}
						{category}
						{isEditing}
						pricingPosition="below"
						pricingSize="sm"
						badgeSize="normal"
						showFlipButtonOnHover={true}
						onHover={(c) => c ? handleCardMouseEnter(stackIndex, c) : handleCardMouseLeave()}
						onDragStart={handleCardDragStart}
						onDragEnd={handleCardDragEnd}
					/>
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Context Menu -->
{#if openCardMenu}
	<div
		bind:this={menuRef}
		class="context-menu"
		style="left: {openCardMenu.x}px; top: {openCardMenu.y}px;"
	>
		{#if category === CardCategory.Commander}
			{@const hasPartner = deck && deck.cards.commander.length === 2}
			{@const canHavePartner = deck && deck.cards.commander.length === 1 && canAddPartner(deck.cards.commander[0])}
			{@const commanderIndex = getCommanderIndex(openCardMenu.card.name)}

			<!-- Commander-specific menu -->
			<button
				onclick={(e) => { e.stopPropagation(); showChangePrintingModal(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				Change printing
			</button>

			{#if hasPartner}
				<!-- Partner commander options -->
				<button
					onclick={(e) => { e.stopPropagation(); showChangeCommanderModal('replace_partner', commanderIndex); }}
					class="menu-item"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
					Replace this partner
				</button>
				<button
					onclick={(e) => { e.stopPropagation(); handleRemovePartner(openCardMenu.card.name); }}
					class="menu-item menu-item-danger"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Remove this partner
				</button>
			{:else}
				<!-- Single commander options -->
				<button
					onclick={(e) => { e.stopPropagation(); showChangeCommanderModal('replace_all', 0); }}
					class="menu-item"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
					</svg>
					Change commander
				</button>
				{#if canHavePartner}
					<button
						onclick={(e) => { e.stopPropagation(); showChangeCommanderModal('add_partner', 0); }}
						class="menu-item menu-item-success"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						Add partner commander
					</button>
				{/if}
			{/if}
		{:else}
			<!-- Regular card menu -->
			<button
				onclick={(e) => { e.stopPropagation(); handleAddOne(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				Add one
			</button>
			<button
				onclick={(e) => { e.stopPropagation(); showAddMoreModal(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				Add more...
			</button>
			<button
				onclick={(e) => { e.stopPropagation(); handleRemove(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
				Remove
			</button>
			<div class="menu-divider"></div>
			<button
				onclick={(e) => { e.stopPropagation(); showChangePrintingModal(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				Change printing
			</button>
			<button
				onclick={(e) => { e.stopPropagation(); handleMoveToMaybeboard(openCardMenu.card); }}
				class="menu-item"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
				</svg>
				Move to Maybeboard
			</button>
		{/if}
	</div>
{/if}

<!-- Modals -->
{#if addMoreCard}
	<AddQuantityModal
		card={addMoreCard.card}
		category={addMoreCard.category}
		onConfirm={handleAddQuantity}
		onClose={() => addMoreCard = null}
	/>
{/if}

{#if changePrintingCard}
	<ChangePrintingModal
		card={changePrintingCard.card}
		category={changePrintingCard.category}
		onConfirm={handleChangePrinting}
		onClose={() => changePrintingCard = null}
	/>
{/if}

<ChangeCommanderModal
	isOpen={isChangeCommanderModalOpen}
	mode={commanderModalMode}
	existingCommanders={deck?.cards.commander || []}
	on:select={handleCommanderSelect}
	on:close={() => isChangeCommanderModalOpen = false}
/>

<style>
	.stacks-category {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		break-inside: avoid;
		page-break-inside: avoid; /* Older browser support */
		margin-bottom: 0.125rem; /* Small gap between stacks in column layout */
	}

	.stacks-category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: var(--color-surface);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.stacks-container {
		position: relative;
		overflow: hidden;
	}

	.stacks-card {
		position: absolute;
		top: calc(var(--stack-index) * 38px);
		left: 0;
		width: 100%;
		transition: top 0.25s ease;
		z-index: var(--stack-index);
	}

	/* Cards above the hovered card move down to fully reveal it including pricing */
	.stacks-card-pushed {
		top: calc(var(--stack-index) * 38px + 340px);
		transition: top 0.35s ease 0.05s;
	}

	/* Context Menu */
	.context-menu {
		position: fixed;
		z-index: 1000;
		min-width: 12rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		padding: 0.25rem;
		animation: menuFadeIn 0.1s ease-out;
	}

	@keyframes menuFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.menu-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.menu-item:hover {
		background: var(--color-surface-hover);
	}

	.menu-item-danger {
		color: rgb(248, 113, 113);
	}

	.menu-item-success {
		color: rgb(74, 222, 128);
	}

	.menu-divider {
		height: 1px;
		background: var(--color-border);
		margin: 0.25rem 0;
	}
</style>
