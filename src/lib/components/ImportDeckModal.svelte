<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { parsePlaintext, type ParseResult } from '$lib/utils/decklist-parser';

	export let isOpen = false;

	const dispatch = createEventDispatcher<{
		close: void;
		import: { deckName: string; commanderName: string; decklist: string };
	}>();

	let deckName = '';
	let decklistInput = '';
	let parseResult: ParseResult | null = null;
	let showErrors = false;
	let commanderName = '';
	let commanderDetected = false;

	// Reset when modal opens
	$: if (isOpen) {
		deckName = '';
		decklistInput = '';
		parseResult = null;
		showErrors = false;
		commanderName = '';
		commanderDetected = false;
	}

	// Parse and detect commander when decklist changes
	$: if (decklistInput.trim()) {
		parseResult = parsePlaintext(decklistInput);
		detectCommander();
	} else {
		parseResult = null;
		commanderName = '';
		commanderDetected = false;
	}

	function detectCommander() {
		if (!decklistInput.trim()) {
			commanderName = '';
			commanderDetected = false;
			return;
		}

		// First, check if the parser found a commander tag ([Commander{top}])
		if (parseResult?.commanderName) {
			commanderName = parseResult.commanderName;
			commanderDetected = true;
			return;
		}

		// Fallback: Get first non-empty line (Moxfield format)
		const lines = decklistInput.split('\n');
		const firstLine = lines.find(line => line.trim().length > 0);

		if (!firstLine) {
			commanderName = '';
			commanderDetected = false;
			return;
		}

		// Parse the first line to extract card name
		// Format: "1 Card Name" or "1x Card Name" or "Card Name"
		const trimmed = firstLine.trim();
		// Updated regex to handle Archidekt format with finish indicators and tags
		// Strip everything after '[' first
		const withoutTags = trimmed.split('[')[0].trim();
		// Strip finish indicators like *F*
		const withoutFinish = withoutTags.replace(/\s+\*[A-Z]+\*\s*/gi, ' ').trim();
		// Now parse the card name
		const match = withoutFinish.match(/^(?:\d+x?\s+)?(.+?)(?:\s+\([A-Z0-9]+\)(?:\s+[A-Z0-9\-★•†‡§¶#*]+)?)?$/i);

		if (match && match[1]) {
			commanderName = match[1].trim();
			commanderDetected = true;
		} else {
			commanderName = '';
			commanderDetected = false;
		}
	}

	function handleImport() {
		// Validate deck name
		if (!deckName.trim()) {
			showErrors = true;
			return;
		}

		// Validate commander
		if (!commanderDetected || !commanderName.trim()) {
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

		// Dispatch import event with deck name, commander, and full decklist
		dispatch('import', {
			deckName: deckName.trim(),
			commanderName: commanderName.trim(),
			decklist: decklistInput
		});

		// Reset form
		deckName = '';
		decklistInput = '';
		parseResult = null;
		showErrors = false;
		commanderName = '';
		commanderDetected = false;
	}

	function handleClose() {
		dispatch('close');
	}

	// Calculate summary stats
	$: totalCards = parseResult?.cards.reduce((sum, card) => sum + card.quantity, 0) || 0;
	$: uniqueCards = parseResult?.cards.length || 0;
	$: errorCount = parseResult?.errors.length || 0;
	$: lineCount = decklistInput.split('\n').length;
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl w-full max-w-4xl mx-4 border border-[var(--color-border)] h-[85vh] flex flex-col"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Import Deck</h2>
				<p class="text-sm text-[var(--color-text-secondary)] mt-1">
					Paste a decklist from Moxfield, Archidekt, or any service. Commander should be the first line or tagged with [Commander{top}].
				</p>
			</div>

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

				<!-- Commander Detection -->
				{#if commanderDetected}
					<div class="mb-4 p-3 bg-green-900/20 border border-green-800 rounded">
						<div class="flex items-start gap-2">
							<svg class="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="text-sm font-medium text-green-400">Commander Detected</p>
								<p class="text-sm text-green-300 mt-1">{commanderName}</p>
							</div>
						</div>
					</div>
				{:else if showErrors && decklistInput.trim()}
					<div class="mb-4 p-3 bg-red-900/20 border border-red-800 rounded">
						<div class="flex items-start gap-2">
							<svg class="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="text-sm font-medium text-red-400">Commander Required</p>
								<p class="text-sm text-red-300 mt-1">The first line of your decklist must be a commander card.</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Decklist Textarea -->
				<div class="flex-1 flex flex-col">
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Decklist <span class="text-red-500">*</span>
					</label>
					<textarea
						bind:value={decklistInput}
						placeholder={'1x Atraxa, Praetors\' Voice [Commander{top}]\n1x Sol Ring (cma) 231\n1x Command Tower (cma) 245\n1x Arcane Signet *F* [Ramp]\n...'}
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
						<div class="mt-3 border border-yellow-800 rounded-lg p-3 bg-yellow-900/20 max-h-32 overflow-y-auto">
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
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center">
				<div class="text-sm text-[var(--color-text-secondary)]">
					{#if showErrors && (!commanderDetected || !deckName.trim())}
						<span class="text-red-400">Please provide a deck name and ensure the first line is your commander</span>
					{:else if commanderDetected && deckName.trim()}
						<span class="text-green-400">Ready to import</span>
					{:else}
						Paste your decklist to get started
					{/if}
				</div>
				<div class="flex gap-3">
					<button
						on:click={handleClose}
						class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
					>
						Cancel
					</button>
					<button
						on:click={handleImport}
						disabled={!deckName.trim() || !commanderDetected}
						class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Import Deck
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
