<script lang="ts">
	import { toastStore } from '$lib/stores/toast-store';
	import Toast from './Toast.svelte';
	import ErrorDetailsModal from './ErrorDetailsModal.svelte';
	import type { Toast as ToastType } from '$lib/stores/toast-store';

	// Subscribe to toast store using Svelte 5 runes pattern
	let toastStoreState = $state($toastStore);

	$effect(() => {
		const unsubscribe = toastStore.subscribe((value) => {
			toastStoreState = value;
		});
		return unsubscribe;
	});

	let toasts = $derived(toastStoreState?.toasts ?? []);

	// Error details modal state
	let showErrorModal = $state(false);
	let errorToast = $state<ToastType | null>(null);

	function handleShowDetails(event: CustomEvent<{ toast: ToastType }>) {
		errorToast = event.detail.toast;
		showErrorModal = true;
	}

	function handleCloseModal() {
		showErrorModal = false;
		errorToast = null;
	}
</script>

<!-- Toast container positioned at bottom-right -->
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
	{#each toasts as toast (toast.id)}
		<div class="pointer-events-auto">
			<Toast {toast} on:showDetails={handleShowDetails} />
		</div>
	{/each}
</div>

<!-- Error Details Modal -->
<ErrorDetailsModal
	isOpen={showErrorModal}
	title="Error Details"
	message={errorToast?.message || ''}
	details={errorToast?.details || ''}
	on:close={handleCloseModal}
/>
