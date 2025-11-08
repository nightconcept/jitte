<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { CardCategory } from '$lib/types/card';

	export let card: Card;
	export let category: CardCategory;
	export let onConfirm: (quantity: number) => void;
	export let onClose: () => void;

	let quantity = 1;

	function handleSubmit() {
		if (quantity > 0) {
			onConfirm(quantity);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSubmit();
		} else if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
	on:click={onClose}
	on:keydown={handleKeydown}
	role="button"
	tabindex="-1"
>
	<!-- Modal Content -->
	<div
		class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="px-6 py-4 border-b border-[var(--color-border)]">
			<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Add Cards</h2>
			<p class="text-sm text-[var(--color-text-secondary)] mt-1">{card.name}</p>
		</div>

		<!-- Body -->
		<div class="px-6 py-4">
			<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
				Quantity to add
			</label>
			<input
				type="number"
				bind:value={quantity}
				min="1"
				max="100"
				class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
				autofocus
			/>
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				on:click={onClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button
				on:click={handleSubmit}
				class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white"
			>
				Add {quantity} {quantity === 1 ? 'card' : 'cards'}
			</button>
		</div>
	</div>
</div>
