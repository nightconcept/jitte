<script lang="ts">
	import { onMount } from 'svelte';
	import { deckStore, currentDiff } from '$lib/stores/deck-store';
	import { deckManager } from '$lib/stores/deck-manager';
	import { toastStore } from '$lib/stores/toast-store';
	import TopNavbar from '$lib/components/TopNavbar.svelte';
	import CommanderHeader from '$lib/components/CommanderHeader.svelte';
	import CardPreview from '$lib/components/CardPreview.svelte';
	import DeckList from '$lib/components/DeckList.svelte';
	import Maybeboard from '$lib/components/Maybeboard.svelte';
	import Statistics from '$lib/components/Statistics.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import NewDeckModal from '$lib/components/NewDeckModal.svelte';
	import ImportDeckModal from '$lib/components/ImportDeckModal.svelte';
	import DeckPickerModal from '$lib/components/DeckPickerModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import NewBranchModal from '$lib/components/NewBranchModal.svelte';
	import EditDecklistModal from '$lib/components/EditDecklistModal.svelte';
	import VersionComparisonModal from '$lib/components/VersionComparisonModal.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';
	import { CardService } from '$lib/api/card-service';
	import { parsePlaintext } from '$lib/utils/decklist-parser';
	import { hasCompletedOnboarding, markOnboardingComplete } from '$lib/utils/onboarding';

	let hoveredCard: Card | null = null;
	let showCommitModal = false;
	let showNewDeckModal = false;
	let showDeckPickerModal = false;
	let showSettingsModal = false;
	let showNewBranchModal = false;
	let showEditDecklistModal = false;
	let showCompareModal = false;
	let showImportDeckModal = false;
	let showUnsavedChangesModal = false;
	let pendingLoadAction: (() => void) | null = null;
	let currentDecklistPlaintext = '';
	let isLoadingCards = false;
	let loadingMessage = 'Loading cards...';
	let showOnboarding = false;

	const cardService = new CardService();

	// Initialize storage on mount
	onMount(async () => {
		await deckManager.initializeStorage();

		// Check if onboarding should be shown
		if (!hasCompletedOnboarding()) {
			showOnboarding = true;
		}
	});

	// Auto-preview first commander when deck changes
	$: if ($deckStore?.deck?.cards?.commander?.[0]) {
		hoveredCard = $deckStore.deck.cards.commander[0];
	}

	function handleCardHover(card: Card | null) {
		// Only update if a card is provided, otherwise keep the last hovered card
		if (card !== null) {
			hoveredCard = card;
		}
	}

	function handleToggleEdit() {
		const current = $deckStore?.isEditing ?? false;
		deckStore.setEditMode(!current);
	}

	async function handleSave() {
		if (!$deckStore) return;

		// Show commit modal
		showCommitModal = true;
	}

	async function handleCommit(version: string, message: string) {
		if (!$deckStore) return;

		console.log('[handleCommit] Starting commit:', { version, message });
		console.log('[handleCommit] Current deck state:', $deckStore.deck);
		console.log('[handleCommit] Current manager state:', $deckManager);

		const success = await deckManager.saveDeck(message, version);

		console.log('[handleCommit] Save result:', success);

		if (success) {
			console.log('[handleCommit] Commit successful, closing modal');
			showCommitModal = false;
			toastStore.success('Deck saved successfully!');

			// Execute pending action if any (from unsaved changes flow)
			if (pendingLoadAction) {
				pendingLoadAction();
				pendingLoadAction = null;
			}
		} else {
			console.error('[handleCommit] Commit failed:', $deckManager.error);
			// Error is stored in deckManager state
			toastStore.error($deckManager.error || 'Failed to save deck');
		}
	}

	function checkUnsavedChanges(action: () => void): boolean {
		const hasUnsavedChanges = $deckStore?.hasUnsavedChanges ?? false;

		if (hasUnsavedChanges) {
			pendingLoadAction = action;
			showUnsavedChangesModal = true;
			return true; // Changes detected
		}

		return false; // No changes
	}

	function handleNewDeck() {
		if (!checkUnsavedChanges(() => showNewDeckModal = true)) {
			showNewDeckModal = true;
		}
	}

	async function handleCreateDeck(event: CustomEvent<{ name: string; commanderNames: string[] }>) {
		const { name, commanderNames } = event.detail;

		try {
			console.log('[handleCreateDeck] Starting deck creation:', { name, commanderNames });

			await deckManager.createDeck(name, commanderNames);

			console.log('[handleCreateDeck] Deck created, closing modal');

			// Close modal immediately
			showNewDeckModal = false;

			console.log('[handleCreateDeck] Modal closed, setting edit mode');

			// Start in edit mode for new decks
			deckStore.setEditMode(true);

			console.log('[handleCreateDeck] Complete');
		} catch (error) {
			console.error('[handleCreateDeck] Error:', error);
			showNewDeckModal = false; // Close modal even on error
			toastStore.error(`Failed to create deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async function handleImportDeck(data: { deckName: string; commanderNames: string[]; decklist: string }) {
		const { deckName, commanderNames, decklist } = data;

		// Close modal immediately and show loading
		showImportDeckModal = false;
		isLoadingCards = true;
		loadingMessage = 'Importing deck...';
		toastStore.info('Importing deck from decklist...');

		try {
			console.log('[handleImportDeck] Starting deck import:', { deckName, commanderNames });

			// Create the deck with the detected commander(s)
			await deckManager.createDeck(deckName, commanderNames);

			console.log('[handleImportDeck] Deck created, now importing cards');

			// Enter edit mode
			deckStore.setEditMode(true);

			// Parse the full decklist first to detect if commander is tagged
			const fullParseResult = parsePlaintext(decklist);

			// Determine if we need to skip the first line or filter the commanders from cards
			let decklistWithoutCommander: string;
			if (fullParseResult.commanderNames && fullParseResult.commanderNames.length > 0) {
				// Commanders were found via [Commander{top}] tags
				// Don't skip first line, but filter the commanders from the parsed cards
				decklistWithoutCommander = decklist;
			} else {
				// Commander is on the first line (Moxfield format)
				// Skip the first line
				const lines = decklist.split('\n');
				decklistWithoutCommander = lines.slice(1).join('\n');
			}

			const parseResult = parsePlaintext(decklistWithoutCommander);

			if (parseResult.cards.length === 0) {
				showImportDeckModal = false;
				toastStore.warning('No cards found in decklist (excluding commander)');
				return;
			}

			// Build a map of existing cards (commander) for fast lookup
			const existingCardsMap = new Map<string, Card>();
			if ($deckStore) {
				const categories: CardCategory[] = [
					CardCategory.Commander,
					CardCategory.Companion,
					CardCategory.Planeswalker,
					CardCategory.Creature,
					CardCategory.Instant,
					CardCategory.Sorcery,
					CardCategory.Artifact,
					CardCategory.Enchantment,
					CardCategory.Land
				];
				for (const category of categories) {
					const categoryCards = $deckStore.deck.cards[category] || [];
					for (const card of categoryCards) {
						existingCardsMap.set(card.name.toLowerCase(), card);
					}
				}
			}

			let successCount = 0;
			let failedCards: string[] = [];
			const finalCards: Card[] = [];

			// Filter out the commanders if they were tagged (to avoid duplicates)
			const cardsToImport = fullParseResult.commanderNames && fullParseResult.commanderNames.length > 0
				? parseResult.cards.filter(card => !fullParseResult.commanderNames!.includes(card.name))
				: parseResult.cards;

			// Fetch all cards from Scryfall using batch API
			const batchResult = await cardService.getCardsBatch(cardsToImport);

			// Process found cards
			for (const parsedCard of cardsToImport) {
				// Try to find by set+collector first, fallback to name
				const lookupKey = parsedCard.setCode && parsedCard.collectorNumber
					? `${parsedCard.setCode.toLowerCase()}|${parsedCard.collectorNumber}`
					: parsedCard.name.toLowerCase();

				const scryfallCard = batchResult.cards.get(lookupKey) || batchResult.cards.get(parsedCard.name.toLowerCase());

				if (scryfallCard) {
					// Convert to our Card type
					const fullCard: Card = {
						name: scryfallCard.name,
						quantity: parsedCard.quantity,
						setCode: parsedCard.setCode || scryfallCard.set.toUpperCase(),
						collectorNumber: parsedCard.collectorNumber || scryfallCard.collector_number,
						scryfallId: scryfallCard.id,
						oracleId: scryfallCard.oracle_id,
						types: scryfallCard.type_line.split(/[\s—]+/).filter(t =>
							['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(t)
						),
						cmc: scryfallCard.cmc,
						manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost,
						colorIdentity: scryfallCard.color_identity as Card['colorIdentity'],
						oracleText: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text,
						imageUrls: {
							small: scryfallCard.image_uris?.small || scryfallCard.card_faces?.[0]?.image_uris?.small,
							normal: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal,
							large: scryfallCard.image_uris?.large || scryfallCard.card_faces?.[0]?.image_uris?.large,
							png: scryfallCard.image_uris?.png || scryfallCard.card_faces?.[0]?.image_uris?.png,
							artCrop: scryfallCard.image_uris?.art_crop || scryfallCard.card_faces?.[0]?.image_uris?.art_crop,
							borderCrop: scryfallCard.image_uris?.border_crop || scryfallCard.card_faces?.[0]?.image_uris?.border_crop,
						},
						price: scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined,
						prices: scryfallCard.prices.usd ? {
							cardkingdom: parseFloat(scryfallCard.prices.usd) * 1.05,
							tcgplayer: parseFloat(scryfallCard.prices.usd),
							manapool: parseFloat(scryfallCard.prices.usd) * 0.95
						} : undefined,
						priceUpdatedAt: Date.now()
					};

					finalCards.push(fullCard);
					successCount++;
				} else {
					// Card not found
					failedCards.push(parsedCard.name);
				}
			}

			// Add any cards from the not_found array
			for (const notFoundCard of batchResult.notFound) {
				const displayName = notFoundCard.setCode && notFoundCard.collectorNumber
					? `${notFoundCard.name} (${notFoundCard.setCode}) ${notFoundCard.collectorNumber}`
					: notFoundCard.name;

				if (!failedCards.includes(displayName)) {
					failedCards.push(displayName);
				}
			}

			// Add all imported cards to the deck
			for (const card of finalCards) {
				deckStore.addCard(card);
			}

			// Hide loading
			isLoadingCards = false;

			// Show result summary
			if (parseResult.errors.length > 0 || failedCards.length > 0) {
				const errorMessage = [];
				if (parseResult.errors.length > 0) {
					errorMessage.push(`${parseResult.errors.length} parsing errors (lines skipped)`);
				}
				if (failedCards.length > 0) {
					errorMessage.push(`${failedCards.length} cards not found: ${failedCards.join(', ')}`);
				}
				toastStore.warning(`Deck imported! ${successCount} cards loaded successfully. ${errorMessage.join('. ')}`, 5000);
			} else {
				toastStore.success(`Deck imported successfully! ${successCount} cards loaded.`);
			}

			console.log('[handleImportDeck] Complete');
		} catch (error) {
			console.error('[handleImportDeck] Error:', error);
			isLoadingCards = false;
			toastStore.error(`Failed to import deck: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	function handleLoadDeck() {
		if (!checkUnsavedChanges(() => showDeckPickerModal = true)) {
			showDeckPickerModal = true;
		}
	}

	async function handleLoadDeckFromPicker(event: CustomEvent<string>) {
		const deckName = event.detail;
		await deckManager.loadDeck(deckName);
		showDeckPickerModal = false;
	}

	function handleDiscardChanges() {
		showUnsavedChangesModal = false;
		if (pendingLoadAction) {
			pendingLoadAction();
			pendingLoadAction = null;
		}
	}

	function handleSaveBeforeLoad() {
		showUnsavedChangesModal = false;
		showCommitModal = true;
		// After commit, execute pending action
		// We'll handle this in handleCommit
	}

	function handleCancelLoad() {
		showUnsavedChangesModal = false;
		pendingLoadAction = null;
	}

	async function handleDeleteDeck(event: CustomEvent<string>) {
		const deckName = event.detail;
		await deckManager.deleteDeck(deckName);
		// Deck picker stays open to allow selecting another deck
	}

	function handleSettings() {
		showSettingsModal = true;
	}

	function handleNewBranch() {
		showNewBranchModal = true;
	}

	async function handleCreateBranch(event: CustomEvent<{ branchName: string; mode: 'current' | 'version'; fromVersion?: string }>) {
		const { branchName, mode, fromVersion } = event.detail;

		const success = await deckManager.createNewBranch(branchName, mode, fromVersion);

		if (success) {
			showNewBranchModal = false;

			// Automatically switch to the new branch
			const switchSuccess = await deckManager.switchToBranch(branchName);

			if (switchSuccess) {
				toastStore.success(`Branch "${branchName}" created and switched to successfully!`);
			} else {
				toastStore.warning(`Branch "${branchName}" created but failed to switch: ${$deckManager.error}`);
			}
		} else {
			toastStore.error($deckManager.error || 'Failed to create branch');
		}
	}

	async function handleExport(platform: 'plaintext' | 'moxfield' | 'archidekt') {
		const plaintext = deckStore.exportToPlaintext(true);
		if (!plaintext) {
			toastStore.warning('No deck loaded to export');
			return;
		}

		try {
			// Platform-specific actions
			if (platform === 'plaintext') {
				// Copy to clipboard only
				await navigator.clipboard.writeText(plaintext);
				toastStore.success('Deck exported to clipboard!');
			} else if (platform === 'moxfield') {
				// Moxfield supports URL parameter import: /import?c=<url_encoded_decklist>
				const encodedDecklist = encodeURIComponent(plaintext);
				const moxfieldUrl = `https://www.moxfield.com/import?c=${encodedDecklist}`;
				window.open(moxfieldUrl, '_blank');
				toastStore.success('Opening Moxfield with your deck...');
			} else if (platform === 'archidekt') {
				// Archidekt supports JSON parameter import: /sandbox?deck=<json_array>
				const archidektJson = buildArchidektJson();
				if (!archidektJson) {
					toastStore.warning('Unable to export: some cards are missing Scryfall IDs');
					return;
				}
				const encodedJson = encodeURIComponent(archidektJson);
				const archidektUrl = `https://archidekt.com/sandbox?deck=${encodedJson}`;
				window.open(archidektUrl, '_blank');
				toastStore.success('Opening Archidekt with your deck...');
			}
		} catch (error) {
			console.error('Failed to export deck:', error);
			toastStore.error('Failed to export deck. Check console for details.');
		}
	}

	/**
	 * Build Archidekt JSON format for deck export
	 * Format: [{"c":"c","f":0,"q":1,"u":"scryfall-uuid"},...]
	 * - c: category ("c"=commander, "m"=mainboard)
	 * - f: foil (0=normal, 1=foil - we don't track foil, always 0)
	 * - q: quantity
	 * - u: Scryfall UUID
	 */
	function buildArchidektJson(): string | null {
		if (!$deckStore?.deck) return null;

		const deck = $deckStore.deck;
		const cards: Array<{ c: string; f: number; q: number; u: string }> = [];

		// Add commanders
		for (const card of deck.cards[CardCategory.Commander] || []) {
			if (!card.scryfallId) {
				console.warn(`Card "${card.name}" missing Scryfall ID`);
				return null; // Can't export without Scryfall IDs
			}
			cards.push({ c: 'c', f: 0, q: card.quantity, u: card.scryfallId });
		}

		// Add all other mainboard cards
		const mainboardCategories = [
			CardCategory.Companion,
			CardCategory.Planeswalker,
			CardCategory.Creature,
			CardCategory.Instant,
			CardCategory.Sorcery,
			CardCategory.Artifact,
			CardCategory.Enchantment,
			CardCategory.Land
		];

		for (const category of mainboardCategories) {
			for (const card of deck.cards[category] || []) {
				if (!card.scryfallId) {
					console.warn(`Card "${card.name}" missing Scryfall ID`);
					return null;
				}
				cards.push({ c: 'm', f: 0, q: card.quantity, u: card.scryfallId });
			}
		}

		return JSON.stringify(cards);
	}

	function handleImport() {
		if (!$deckStore) {
			toastStore.warning('Please create or load a deck first');
			return;
		}

		// Export current deck to plaintext (excluding commander)
		const plaintext = deckStore.exportToPlaintext(true, true);
		currentDecklistPlaintext = plaintext || '';
		showEditDecklistModal = true;
	}

	async function handleSaveDecklist(event: CustomEvent<{ decklist: string }>) {
		const { decklist } = event.detail;

		if (!$deckStore) {
			toastStore.error('No deck loaded');
			return;
		}

		// Close modal and show loading
		showEditDecklistModal = false;
		isLoadingCards = true;
		loadingMessage = 'Processing decklist...';
		toastStore.info('Loading cards from Scryfall...');

		// Parse the decklist
		const parseResult = parsePlaintext(decklist);

		if (parseResult.cards.length === 0) {
			isLoadingCards = false;
			toastStore.warning('No valid cards found in decklist');
			return;
		}

		// Enter edit mode if not already
		if (!$deckStore.isEditing) {
			deckStore.setEditMode(true);
		}

		// Build a map of existing cards by name for fast lookup
		const existingCardsMap = new Map<string, Card>();
		const categories: CardCategory[] = [
			CardCategory.Commander,
			CardCategory.Companion,
			CardCategory.Planeswalker,
			CardCategory.Creature,
			CardCategory.Instant,
			CardCategory.Sorcery,
			CardCategory.Artifact,
			CardCategory.Enchantment,
			CardCategory.Land
		];
		for (const category of categories) {
			const categoryCards = $deckStore.deck.cards[category] || [];
			for (const card of categoryCards) {
				existingCardsMap.set(card.name.toLowerCase(), card);
			}
		}

		let successCount = 0;
		let failedCards: string[] = [];
		let newCardsNeeded: typeof parseResult.cards = [];
		const finalCards: Card[] = [];

		// First pass: reuse existing card data where possible
		for (const parsedCard of parseResult.cards) {
			const existingCard = existingCardsMap.get(parsedCard.name.toLowerCase());

			if (existingCard) {
				// Reuse existing card data, just update quantity
				finalCards.push({
					...existingCard,
					quantity: parsedCard.quantity,
					// Update set code if explicitly specified in bulk edit
					...(parsedCard.setCode && { setCode: parsedCard.setCode }),
					...(parsedCard.collectorNumber && { collectorNumber: parsedCard.collectorNumber })
				});
				successCount++;
			} else {
				// Card is new, we'll need to fetch it
				newCardsNeeded.push(parsedCard);
			}
		}

		// Second pass: fetch only new cards from Scryfall (using batch API with set/collector support)
		if (newCardsNeeded.length > 0) {
			const batchResult = await cardService.getCardsBatch(newCardsNeeded);

			// Process found cards
			for (const parsedCard of newCardsNeeded) {
				// Try to find by set+collector first, fallback to name
				const lookupKey = parsedCard.setCode && parsedCard.collectorNumber
					? `${parsedCard.setCode.toLowerCase()}|${parsedCard.collectorNumber}`
					: parsedCard.name.toLowerCase();

				const scryfallCard = batchResult.cards.get(lookupKey) || batchResult.cards.get(parsedCard.name.toLowerCase());

				if (scryfallCard) {
					// Convert to our Card type (same as CardSearch.svelte)
					const fullCard: Card = {
						name: scryfallCard.name,
						quantity: parsedCard.quantity,
						setCode: parsedCard.setCode || scryfallCard.set.toUpperCase(),
						collectorNumber: parsedCard.collectorNumber || scryfallCard.collector_number,
						scryfallId: scryfallCard.id,
						oracleId: scryfallCard.oracle_id,
						types: scryfallCard.type_line.split(/[\s—]+/).filter(t =>
							['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'].includes(t)
						),
						cmc: scryfallCard.cmc,
						manaCost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost,
						colorIdentity: scryfallCard.color_identity as Card['colorIdentity'],
						oracleText: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text,
						imageUrls: {
							small: scryfallCard.image_uris?.small || scryfallCard.card_faces?.[0]?.image_uris?.small,
							normal: scryfallCard.image_uris?.normal || scryfallCard.card_faces?.[0]?.image_uris?.normal,
							large: scryfallCard.image_uris?.large || scryfallCard.card_faces?.[0]?.image_uris?.large,
							png: scryfallCard.image_uris?.png || scryfallCard.card_faces?.[0]?.image_uris?.png,
							artCrop: scryfallCard.image_uris?.art_crop || scryfallCard.card_faces?.[0]?.image_uris?.art_crop,
							borderCrop: scryfallCard.image_uris?.border_crop || scryfallCard.card_faces?.[0]?.image_uris?.border_crop,
						},
						price: scryfallCard.prices.usd ? parseFloat(scryfallCard.prices.usd) : undefined,
						prices: scryfallCard.prices.usd ? {
							cardkingdom: parseFloat(scryfallCard.prices.usd) * 1.05,
							tcgplayer: parseFloat(scryfallCard.prices.usd),
							manapool: parseFloat(scryfallCard.prices.usd) * 0.95
						} : undefined,
						priceUpdatedAt: Date.now()
					};

					finalCards.push(fullCard);
					successCount++;
				} else {
					// Card not found
					failedCards.push(parsedCard.name);
				}
			}

			// Add any cards from the not_found array that weren't already tracked
			for (const notFoundCard of batchResult.notFound) {
				const displayName = notFoundCard.setCode && notFoundCard.collectorNumber
					? `${notFoundCard.name} (${notFoundCard.setCode}) ${notFoundCard.collectorNumber}`
					: notFoundCard.name;

				if (!failedCards.includes(displayName)) {
					failedCards.push(displayName);
				}
			}
		}

		// Replace the entire deck with the new cards
		deckStore.replaceDeck(finalCards);

		// Hide loading
		isLoadingCards = false;

		// Show result summary
		if (parseResult.errors.length > 0 || failedCards.length > 0) {
			const errorMessage = [];
			if (parseResult.errors.length > 0) {
				errorMessage.push(`${parseResult.errors.length} parsing errors (lines skipped)`);
			}
			if (failedCards.length > 0) {
				errorMessage.push(`${failedCards.length} cards not found: ${failedCards.join(', ')}`);
			}
			toastStore.warning(`Decklist updated! ${successCount} cards loaded successfully. ${errorMessage.join('. ')}`, 5000);
		} else {
			toastStore.success(`Decklist updated successfully! ${successCount} cards loaded.`);
		}
	}

	async function handleSwitchVersion(version: string) {
		if (!$deckStore || !$deckManager.activeDeckName) return;

		// Warn if there are unsaved changes
		if ($deckStore.hasUnsavedChanges) {
			const confirmed = confirm('You have unsaved changes. Switching versions will discard them. Continue?');
			if (!confirmed) return;
		}

		await deckManager.loadVersion(version);
	}

	async function handleSwitchBranch(branch: string) {
		if (!$deckStore || !$deckManager.activeDeckName) return;

		// Warn if there are unsaved changes
		if ($deckStore.hasUnsavedChanges) {
			const confirmed = confirm('You have unsaved changes. Switching branches will discard them. Continue?');
			if (!confirmed) return;
		}

		const success = await deckManager.switchToBranch(branch);

		if (success) {
			toastStore.success(`Switched to branch "${branch}"`);
		} else {
			toastStore.error($deckManager.error || 'Failed to switch branch');
		}
	}

	async function handleDeleteBranch(branch: string) {
		if (!$deckStore || !$deckManager.activeDeckName) return;

		const success = await deckManager.deleteBranchFromDeck(branch);
		if (success) {
			toastStore.success(`Branch "${branch}" deleted successfully!`);
		} else {
			toastStore.error($deckManager.error || 'Failed to delete branch');
		}
	}

	function handleCompare() {
		showCompareModal = true;
	}

	function handleOnboardingComplete() {
		markOnboardingComplete();
		showOnboarding = false;
		toastStore.success('Welcome to Jitte!');
	}

	function handleOnboardingClose() {
		showOnboarding = false;
	}

	function handleRedoOnboarding() {
		showOnboarding = true;
	}

	// Get available versions for branch modal
	$: availableVersions = $deckManager.activeManifest?.branches
		?.find(b => b.name === ($deckStore?.deck.currentBranch || 'main'))
		?.versions?.map(v => v.version) || [];

	// Get available branches
	$: availableBranches = $deckManager.activeManifest?.branches
		?.map(b => b.name) || ['main'];
</script>

<div class="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
	<!-- Top Navigation Bar -->
	<TopNavbar
		hasDeck={$deckStore !== null}
		isEditing={$deckStore?.isEditing ?? false}
		hasUnsavedChanges={$deckStore?.hasUnsavedChanges ?? false}
		isNewDeck={$deckManager.activeManifest === null}
		currentBranch={$deckStore?.deck.currentBranch ?? 'main'}
		currentVersion={$deckStore?.deck.currentVersion ?? '0.1.0'}
		availableVersions={availableVersions}
		availableBranches={availableBranches}
		onToggleEdit={handleToggleEdit}
		onSave={handleSave}
		onNewDeck={handleNewDeck}
		onLoadDeck={handleLoadDeck}
		onSettings={handleSettings}
		onNewBranch={handleNewBranch}
		onExport={handleExport}
		onImport={() => showImportDeckModal = true}
		onCompare={handleCompare}
		onSwitchVersion={handleSwitchVersion}
		onSwitchBranch={handleSwitchBranch}
		onDeleteBranch={handleDeleteBranch}
	/>

	{#if $deckManager.isLoading}
		<!-- Loading State -->
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<div class="text-[var(--color-text-primary)] text-lg mb-2">Loading...</div>
				<div class="text-[var(--color-text-tertiary)] text-sm">
					Please wait
				</div>
			</div>
		</div>
	{:else if !$deckStore}
		<!-- Empty State - No Deck Loaded -->
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center max-w-md px-4">
				<div class="mb-6">
					<!-- Jitte Logo -->
					<div class="w-24 h-24 mx-auto rounded-xl flex items-center justify-center font-bold text-white shadow-lg" style="background: linear-gradient(to bottom right, var(--color-brand-primary), var(--color-accent-purple));">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16">
							<rect x="11.2" y="3" width="1.6" height="19" rx="0.4"/>
							<circle cx="12" cy="2.8" r="0.6"/>
							<path d="M11 15.5 L8 15.5 L8 11.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
							<circle cx="12" cy="22.2" r="0.8"/>
						</svg>
					</div>
				</div>

				<h1 class="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
					Welcome to Jitte
				</h1>
				<p class="text-[var(--color-text-secondary)] mb-8">
					A local-first Commander deck manager with git-style version control.
				</p>

				<div class="space-y-3">
					<button
						onclick={handleNewDeck}
						class="w-full px-6 py-3 rounded-lg bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white font-medium flex items-center justify-center gap-2 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create New Deck
					</button>

					<button
						onclick={() => showImportDeckModal = true}
						class="w-full px-6 py-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center justify-center gap-2 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
						Import Deck
					</button>

					<button
						onclick={handleLoadDeck}
						class="w-full px-6 py-3 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center justify-center gap-2 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
						</svg>
						Load Existing Deck
					</button>
				</div>

				{#if $deckManager.decks.length > 0}
					<p class="text-sm text-[var(--color-text-tertiary)] mt-4">
						You have {$deckManager.decks.length} deck{$deckManager.decks.length === 1 ? '' : 's'} saved
					</p>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Commander Header with Gradient -->
		<CommanderHeader />

		<!-- Main Content -->
		<div class="flex flex-1">
			<!-- Card Preview Sidebar (Left, Sticky) -->
			<CardPreview {hoveredCard} />

			<!-- Center Column -->
			<div class="flex-1 flex flex-col">
				<!-- Deck List -->
				<DeckList onCardHover={handleCardHover} onImport={handleImport} />

				<!-- Statistics Panel (Bottom, Collapsible) -->
				<div class="border-t border-[var(--color-border)]">
					<Statistics />
				</div>
			</div>

			<!-- Maybeboard Sidebar (Right, Sticky) -->
			<Maybeboard onCardHover={handleCardHover} />
		</div>
	{/if}
</div>

<!-- Modals -->
<CommitModal
	isOpen={showCommitModal && $deckStore !== null}
	currentVersion={$deckStore?.deck.currentVersion ?? '0.1.0'}
	diff={$currentDiff}
	onCommit={handleCommit}
	onCancel={() => showCommitModal = false}
/>

<NewDeckModal
	isOpen={showNewDeckModal}
	on:create={handleCreateDeck}
	on:close={() => showNewDeckModal = false}
/>

<ImportDeckModal
	isOpen={showImportDeckModal}
	onImport={handleImportDeck}
	onClose={() => showImportDeckModal = false}
/>

<DeckPickerModal
	isOpen={showDeckPickerModal}
	decks={$deckManager.decks}
	on:load={handleLoadDeckFromPicker}
	on:delete={handleDeleteDeck}
	on:close={() => showDeckPickerModal = false}
/>

<!-- Unsaved Changes Warning Modal -->
{#if showUnsavedChangesModal}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
		<div class="bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-md mx-4 border border-[var(--color-border)]">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Unsaved Changes</h2>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<p class="text-[var(--color-text-primary)] mb-4">
					You have unsaved changes. What would you like to do?
				</p>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
				<button
					onclick={handleCancelLoad}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Cancel
				</button>
				<button
					onclick={handleDiscardChanges}
					class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
				>
					Discard Changes
				</button>
				<button
					onclick={handleSaveBeforeLoad}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

<SettingsModal
	isOpen={showSettingsModal}
	on:close={() => showSettingsModal = false}
	on:redoOnboarding={handleRedoOnboarding}
/>

<NewBranchModal
	isOpen={showNewBranchModal}
	currentBranch={$deckStore?.deck.currentBranch ?? 'main'}
	availableVersions={availableVersions}
	on:create={handleCreateBranch}
	on:close={() => showNewBranchModal = false}
/>

<EditDecklistModal
	isOpen={showEditDecklistModal}
	currentDecklist={currentDecklistPlaintext}
	on:save={handleSaveDecklist}
	on:close={() => showEditDecklistModal = false}
/>

<VersionComparisonModal
	isOpen={showCompareModal}
	currentVersion={$deckStore?.deck.currentVersion ?? '1.0.0'}
	currentBranch={$deckStore?.deck.currentBranch ?? 'main'}
	onClose={() => showCompareModal = false}
/>

<!-- Loading Overlay -->
<LoadingOverlay isLoading={isLoadingCards} message={loadingMessage} />

<!-- Onboarding Overlay -->
<OnboardingOverlay
	isOpen={showOnboarding}
	on:complete={handleOnboardingComplete}
	on:close={handleOnboardingClose}
/>
