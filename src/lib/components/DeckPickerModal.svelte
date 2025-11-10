<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import BaseModal from './BaseModal.svelte';
	import type { DeckListItem } from '$lib/stores/deck-manager';

	export let isOpen = false;
	export let decks: DeckListItem[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		load: string; // deck name
		delete: string; // deck name
	}>();

	let deckToDelete: string | null = null;

	function handleLoad(deckName: string) {
		dispatch('load', deckName);
		dispatch('close');
	}

	function confirmDelete(deckName: string) {
		deckToDelete = deckName;
	}

	function handleDelete() {
		if (deckToDelete) {
			dispatch('delete', deckToDelete);
			deckToDelete = null;
		}
	}

	function cancelDelete() {
		deckToDelete = null;
	}

	function handleClose() {
		dispatch('close');
		deckToDelete = null;
	}

	function formatDate(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) {
			return 'Just now';
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
		} else {
			const diffDays = Math.floor(diffHours / 24);
			if (diffDays < 7) {
				return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
			} else {
				return date.toLocaleDateString();
			}
		}
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		} else if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		} else {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
	}
</script>

<BaseModal
	{isOpen}
	onClose={handleClose}
	title="Load Deck"
	subtitle="{decks.length} deck{decks.length === 1 ? '' : 's'} available"
	size="2xl"
	height="max-h-[80vh]"
	contentClass="flex flex-col"
>
	{#snippet children()}
		<!-- Body -->
		<div class="flex-1 overflow-y-auto">
			{#if decks.length === 0}
				<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
					<p>No decks found. Create a new deck to get started!</p>
				</div>
			{:else}
				<div class="divide-y divide-[var(--color-border)]">
					{#each decks as deck}
						<div class="px-6 py-4 hover:bg-[var(--color-surface-hover)] transition-colors">
							<div class="flex items-center justify-between gap-4">
								<button
									type="button"
									class="flex-1 text-left min-w-0"
									on:click={() => handleLoad(deck.name)}
								>
									<div class="font-medium text-[var(--color-text-primary)] truncate">
										{deck.name}
									</div>
									<div class="text-sm text-[var(--color-text-secondary)] mt-1">
										Last modified: {formatDate(deck.lastModified)} • {formatSize(deck.size)}
									</div>
								</button>

								<button
									type="button"
									class="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded border border-red-500/50 hover:border-red-500"
									on:click={() => confirmDelete(deck.name)}
								>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
			<button
				on:click={handleClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>

<!-- Delete Confirmation Modal -->
<BaseModal isOpen={deckToDelete !== null} onClose={cancelDelete} title="Delete Deck?" size="md">
	{#snippet children()}
		<div class="px-6 py-4">
			<p class="text-sm text-[var(--color-text-secondary)]">
				Are you sure you want to delete "<span class="font-medium">{deckToDelete}</span>"? This
				action cannot be undone.
			</p>
		</div>

		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				on:click={cancelDelete}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button on:click={handleDelete} class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white">
				Delete
			</button>
		</div>
	{/snippet}
</BaseModal>
