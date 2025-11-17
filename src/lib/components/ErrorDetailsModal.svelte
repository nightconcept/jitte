<script lang="ts">
	import BaseModal from './BaseModal.svelte';

	let {
		isOpen = $bindable(false),
		title = 'Error Details',
		message = '',
		details = '',
		onClose
	}: {
		isOpen?: boolean;
		title?: string;
		message?: string;
		details?: string;
		onClose?: () => void;
	} = $props();

	function handleClose() {
		isOpen = false;
		onClose?.();
	}

	function copyToClipboard() {
		const fullError = `${message}\n\nDetails:\n${details}`;
		navigator.clipboard.writeText(fullError);
	}
</script>

<BaseModal {isOpen} onClose={handleClose} {title} size="2xl" variant="error">
	{#snippet children()}
		<!-- Body -->
		<div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
			<!-- Error Icon -->
			<div class="flex items-center gap-2 mb-4 text-red-400">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span class="font-semibold">An error occurred</span>
			</div>

			<!-- Error Message -->
			<div class="mb-4">
				<h3 class="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
					Error Message:
				</h3>
				<div
					class="p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] text-red-400"
				>
					{message}
				</div>
			</div>

			<!-- Error Details -->
			<div>
				<h3 class="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Details:</h3>
				<div
					class="p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono text-xs whitespace-pre-wrap break-all"
				>
					{details}
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-between w-full">
			<button
				onclick={copyToClipboard}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				Copy to Clipboard
			</button>
			<button onclick={handleClose} class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white">
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>
