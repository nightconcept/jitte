<script lang="ts">
	import { type Snippet } from 'svelte';
	import BaseModal from './BaseModal.svelte';

	let {
		isOpen = $bindable(false),
		title,
		initialValue = '',
		placeholder = 'Folder name',
		onConfirm,
		onCancel
	}: {
		isOpen?: boolean;
		title: string;
		initialValue?: string;
		placeholder?: string;
		onConfirm: (value: string) => void;
		onCancel?: () => void;
	} = $props();

	let inputValue = $state(initialValue);
	let inputElement: HTMLInputElement | undefined = $state();

	// Reset input value when modal opens
	$effect(() => {
		if (isOpen) {
			inputValue = initialValue;
			// Focus the input when modal opens
			setTimeout(() => inputElement?.focus(), 50);
		}
	});

	function handleConfirm() {
		const trimmed = inputValue.trim();
		if (trimmed.length > 0) {
			onConfirm(trimmed);
			isOpen = false;
		}
	}

	function handleCancel() {
		onCancel?.();
		isOpen = false;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleConfirm();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancel();
		}
	}
</script>

<BaseModal {isOpen} onClose={handleCancel} {title} size="md">
	{#snippet children()}
		<div class="px-6 py-4">
			<input
				bind:this={inputElement}
				type="text"
				bind:value={inputValue}
				{placeholder}
				class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-blue)] focus:border-transparent"
				onkeydown={handleKeyDown}
				maxlength="100"
			/>
			<div class="mt-2 text-xs text-[var(--color-text-secondary)]">
				{inputValue.length}/100 characters
			</div>
		</div>

		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				type="button"
				onclick={handleCancel}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={inputValue.trim().length === 0}
				class="px-4 py-2 rounded bg-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Confirm
			</button>
		</div>
	{/snippet}
</BaseModal>
