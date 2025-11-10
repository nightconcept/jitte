<script lang="ts">
	import { parsePlaintext, type ParseResult } from '$lib/utils/decklist-parser';
	import CommanderSearch from './CommanderSearch.svelte';
	import BaseModal from './BaseModal.svelte';
	import type { Card } from '$lib/types/card';

	let {
		isOpen = false,
		onClose = undefined,
		onImport = undefined
	}: {
		isOpen?: boolean;
		onClose?: () => void;
		onImport?: (data: { deckName: string; commanderNames: string[]; decklist: string }) => void;
	} = $props();

	let deckName = $state('');
	let decklistInput = $state('');
	let selectedCommanders = $state<Card[]>([]);
	let parseResult = $state<ParseResult | null>(null);
	let showErrors = $state(false);

	// Reset when modal opens
	$effect(() => {
		if (isOpen) {
			deckName = '';
			decklistInput = '';
			selectedCommanders = [];
			parseResult = null;
			showErrors = false;
		}
	});

	// Parse decklist when input changes
	$effect(() => {
		if (decklistInput.trim()) {
			const newParseResult = parsePlaintext(decklistInput);
			parseResult = newParseResult;
		} else {
			parseResult = null;
		}
	});

	function handleImport() {
		// Validate deck name
		if (!deckName.trim()) {
			showErrors = true;
			return;
		}

		// Validate commander
		if (selectedCommanders.length === 0) {
			showErrors = true;
			return;
		}

		// Parse and validate decklist
		if (!decklistInput.trim()) {
			showErrors = true;
			return;
		}

		parseResult = parsePlaintext(decklistInput);

		// Check for critical parse errors (cards not found is okay, we'll fetch from Scryfall)
		if (!parseResult || parseResult.cards.length === 0) {
			showErrors = true;
			return;
		}

		// Call onImport callback with deck name, commanders, and full decklist
		if (onImport) {
			onImport({
				deckName: deckName.trim(),
				commanderNames: selectedCommanders.map((c) => c.name),
				decklist: decklistInput
			});
		}

		// Reset form
		deckName = '';
		decklistInput = '';
		selectedCommanders = [];
		parseResult = null;
		showErrors = false;
	}

	// Calculate summary stats
	let totalCards = $derived(parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0);
	let uniqueCards = $derived(parseResult?.cards.length || 0);
	let errorCount = $derived(parseResult?.errors.length || 0);
	let lineCount = $derived(decklistInput.split('\n').length);
</script>

<BaseModal
	{isOpen}
	{onClose}
	title="Import Deck"
	subtitle="Paste a decklist from Moxfield, Archidekt, or any service. Partner commanders are supported."
	size="4xl"
	height="h-[85vh]"
	contentClass="flex flex-col"
>
	{#snippet children()}
		<!-- Body - Full height content -->
		<div class="px-6 py-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
			<!-- Deck Name -->
			<div class="mb-4">
				<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
					Deck Name <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					bind:value={deckName}
					placeholder="My Awesome Commander Deck"
					class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
				/>
			</div>

			<!-- Commander Search -->
			<div class="mb-4">
				<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
					Commander(s) <span class="text-red-500">*</span>
				</label>
				<CommanderSearch bind:selectedCommanders maxCommanders={2} />
				{#if showErrors && selectedCommanders.length === 0}
					<div class="mt-3 p-3 bg-red-900/20 border border-red-800 rounded">
						<div class="flex items-start gap-2">
							<svg
								class="w-5 h-5 text-red-400 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div>
								<p class="text-sm font-medium text-red-400">Commander Required</p>
								<p class="text-sm text-red-300 mt-1">You must select at least one commander.</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Decklist Textarea -->
			<div class="flex-1 flex flex-col">
				<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
					Decklist <span class="text-red-500">*</span>
				</label>
				<textarea
					bind:value={decklistInput}
					placeholder={'1x Thrasios, Triton Hero [Commander{top}]\n1x Tymna the Weaver [Commander{top}]\n1x Sol Ring (cma) 231\n1x Command Tower (cma) 245\n1x Arcane Signet *F* [Ramp]\n...'}
					class="flex-1 px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] font-mono text-sm resize-none"
					autofocus
				/>

				<!-- Status Bar -->
				<div class="flex justify-between items-center mt-2">
					<p class="text-xs text-[var(--color-text-tertiary)]">
						Formats: "1 Card Name", "2x Card", "1 Card (SET) 123"
					</p>
					<p class="text-xs text-[var(--color-text-secondary)]">
						{lineCount} lines • {totalCards} cards
					</p>
				</div>

				<!-- Parse Errors (if any) -->
				{#if showErrors && errorCount > 0 && parseResult}
					<div
						class="mt-3 border border-yellow-800 rounded-lg p-3 bg-yellow-900/20 max-h-32 overflow-y-auto"
					>
						<h4 class="text-sm font-semibold text-yellow-400 mb-2">
							Parsing Warnings ({errorCount})
						</h4>
						<div class="space-y-1">
							{#each parseResult.errors.slice(0, 5) as error}
								<div class="text-xs">
									<span class="text-yellow-300">Line {error.line}:</span>
									<span class="text-[var(--color-text-secondary)] ml-2">{error.text}</span>
								</div>
							{/each}
							{#if errorCount > 5}
								<p class="text-xs text-yellow-400 mt-1">...and {errorCount - 5} more</p>
							{/if}
						</div>
						<p class="text-xs text-yellow-400 mt-2">
							Note: Lines will be skipped, but the import will continue.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div
			class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center"
		>
			<div class="text-sm text-[var(--color-text-secondary)]">
				{#if showErrors && (selectedCommanders.length === 0 || !deckName.trim())}
					<span class="text-red-400">Please provide a deck name and valid commander(s)</span>
				{:else if selectedCommanders.length > 0 && deckName.trim()}
					<span class="text-green-400">Ready to import</span>
				{:else}
					Enter deck details to get started
				{/if}
			</div>
			<div class="flex gap-3">
				<button
					onclick={onClose}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Cancel
				</button>
				<button
					onclick={handleImport}
					disabled={!deckName.trim() || selectedCommanders.length === 0}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Import Deck
				</button>
			</div>
		</div>
	{/snippet}
</BaseModal>
