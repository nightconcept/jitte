<script lang="ts">
	import { onMount } from 'svelte';
	import { deckStore, currentDiff } from '$lib/stores/deck-store';
	import { deckManager } from '$lib/stores/deck-manager';
	import TopNavbar from '$lib/components/TopNavbar.svelte';
	import CommanderHeader from '$lib/components/CommanderHeader.svelte';
	import CardPreview from '$lib/components/CardPreview.svelte';
	import DeckList from '$lib/components/DeckList.svelte';
	import Maybeboard from '$lib/components/Maybeboard.svelte';
	import Statistics from '$lib/components/Statistics.svelte';
	import CommitModal from '$lib/components/CommitModal.svelte';
	import NewDeckModal from '$lib/components/NewDeckModal.svelte';
	import DeckPickerModal from '$lib/components/DeckPickerModal.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import NewBranchModal from '$lib/components/NewBranchModal.svelte';
	import type { Card } from '$lib/types/card';

	let hoveredCard: Card | null = null;
	let showCommitModal = false;
	let showNewDeckModal = false;
	let showDeckPickerModal = false;
	let showSettingsModal = false;
	let showNewBranchModal = false;

	// Initialize storage on mount
	onMount(async () => {
		await deckManager.initializeStorage();
	});

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

		const success = await deckManager.saveDeck(message, version);

		if (success) {
			showCommitModal = false;
		} else {
			// Error is stored in deckManager state
			alert($deckManager.error || 'Failed to save deck');
		}
	}

	function handleNewDeck() {
		showNewDeckModal = true;
	}

	async function handleCreateDeck(event: CustomEvent<{ name: string; commanderName: string }>) {
		const { name, commanderName } = event.detail;

		await deckManager.createDeck(name, commanderName);
		showNewDeckModal = false;

		// Start in edit mode for new decks
		deckStore.setEditMode(true);
	}

	function handleLoadDeck() {
		showDeckPickerModal = true;
	}

	async function handleLoadDeckFromPicker(event: CustomEvent<string>) {
		const deckName = event.detail;
		await deckManager.loadDeck(deckName);
		showDeckPickerModal = false;
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

		// TODO: Implement branch creation in deckManager
		// For now, just log the intent
		console.log('Creating branch:', { branchName, mode, fromVersion });

		showNewBranchModal = false;
	}

	async function handleExport() {
		const plaintext = deckStore.exportToPlaintext(true);
		if (!plaintext) {
			alert('No deck loaded to export');
			return;
		}

		try {
			await navigator.clipboard.writeText(plaintext);
			alert('Deck exported to clipboard!');
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
			alert('Failed to copy to clipboard. Check console for details.');
		}
	}

	function handleImport() {
		// TODO: Show import modal
		console.log('Import clicked - modal not yet implemented');
		alert('Import functionality coming soon!');
	}

	// Get available versions for branch modal
	$: availableVersions = $deckManager.activeManifest?.branches
		?.find(b => b.name === ($deckStore?.deck.currentBranch || 'main'))
		?.versions?.map(v => v.version) || [];
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
		onToggleEdit={handleToggleEdit}
		onSave={handleSave}
		onNewDeck={handleNewDeck}
		onLoadDeck={handleLoadDeck}
		onSettings={handleSettings}
		onNewBranch={handleNewBranch}
		onExport={handleExport}
		onImport={handleImport}
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
						on:click={handleNewDeck}
						class="w-full px-6 py-3 rounded-lg bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white font-medium flex items-center justify-center gap-2 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Create New Deck
					</button>

					<button
						on:click={handleLoadDeck}
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
				<DeckList onCardHover={handleCardHover} />

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

<DeckPickerModal
	isOpen={showDeckPickerModal}
	decks={$deckManager.decks}
	on:load={handleLoadDeckFromPicker}
	on:delete={handleDeleteDeck}
	on:close={() => showDeckPickerModal = false}
/>

<SettingsModal
	isOpen={showSettingsModal}
	on:close={() => showSettingsModal = false}
/>

<NewBranchModal
	isOpen={showNewBranchModal}
	currentBranch={$deckStore?.deck.currentBranch ?? 'main'}
	availableVersions={availableVersions}
	on:create={handleCreateBranch}
	on:close={() => showNewBranchModal = false}
/>
