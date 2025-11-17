<script lang="ts">
	import BaseModal from './BaseModal.svelte';
	import type { Card } from '$lib/types/card';
	import type { Snippet } from 'svelte';

	let {
		card,
		isOpen = $bindable(false),
		onConfirm,
		onClose
	}: {
		card: Card;
		isOpen?: boolean;
		onConfirm: (quantity: number) => void;
		onClose?: () => void;
	} = $props();

	let quantity = $state(1);

	function handleSubmit() {
		if (quantity > 0) {
			onConfirm(quantity);
			isOpen = false;
		}
	}

	function handleClose() {
		isOpen = false;
		onClose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<BaseModal {isOpen} onClose={handleClose} title="Add Cards" subtitle={card.name} size="md">
	{#snippet children()}
		<!-- Body -->
		<div class="px-6 py-4">
			<label
				for="quantity-input"
				class="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
			>
				Quantity to add
			</label>
			<input
				id="quantity-input"
				type="number"
				bind:value={quantity}
				min="1"
				max="100"
				onkeydown={handleKeydown}
				class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
			/>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<button
				onclick={handleClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button
				onclick={handleSubmit}
				class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
			>
				Add {quantity}
				{quantity === 1 ? 'card' : 'cards'}
			</button>
		</div>
	{/snippet}
</BaseModal>
