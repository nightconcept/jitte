<script lang="ts">
	import type { Toast } from '$lib/stores/toast-store';
	import { toastStore } from '$lib/stores/toast-store';
	import { createEventDispatcher } from 'svelte';

	let { toast }: { toast: Toast } = $props();

	const dispatch = createEventDispatcher<{ showDetails: { toast: Toast } }>();

	const icons = {
		success: '✓',
		error: '✕',
		info: 'ℹ',
		warning: '⚠'
	};

	const styles = {
		success: 'bg-green-900 border-green-700 text-green-100',
		error: 'bg-red-900 border-red-700 text-red-100',
		info: 'bg-blue-900 border-blue-700 text-blue-100',
		warning: 'bg-yellow-900 border-yellow-700 text-yellow-100'
	};

	const iconStyles = {
		success: 'text-green-400',
		error: 'text-red-400',
		info: 'text-blue-400',
		warning: 'text-yellow-400'
	};

	function handleClose() {
		toastStore.dismiss(toast.id);
	}

	function handleShowDetails() {
		dispatch('showDetails', { toast });
	}
</script>

<div
	class="flex items-start gap-3 rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-300 ease-in-out animate-slide-in {styles[
		toast.type
	]}"
	role="alert"
>
	<!-- Icon -->
	<div class="flex-shrink-0 text-lg font-bold {iconStyles[toast.type]}">
		{icons[toast.type]}
	</div>

	<!-- Message -->
	<div class="flex-1 flex flex-col gap-2">
		<div class="text-sm leading-relaxed">
			{toast.message}
		</div>
		{#if toast.details}
			<button
				type="button"
				onclick={handleShowDetails}
				class="text-xs underline text-left hover:opacity-80 transition-opacity"
			>
				View Details
			</button>
		{/if}
	</div>

	<!-- Close button -->
	<button
		type="button"
		onclick={handleClose}
		class="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-150"
		aria-label="Close notification"
	>
		<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
			<path
				fill-rule="evenodd"
				d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
				clip-rule="evenodd"
			/>
		</svg>
	</button>
</div>

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>
