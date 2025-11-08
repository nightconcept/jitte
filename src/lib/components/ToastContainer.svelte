<script lang="ts">
	import { toastStore } from '$lib/stores/toast-store';
	import Toast from './Toast.svelte';

	// Subscribe to toast store using Svelte 5 runes pattern
	let toastStoreState = $state($toastStore);

	$effect(() => {
		const unsubscribe = toastStore.subscribe((value) => {
			toastStoreState = value;
		});
		return unsubscribe;
	});

	let toasts = $derived(toastStoreState?.toasts ?? []);
</script>

<!-- Toast container positioned at top-right -->
<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
	{#each toasts as toast (toast.id)}
		<div class="pointer-events-auto">
			<Toast {toast} />
		</div>
	{/each}
</div>
