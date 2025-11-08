<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	const { children } = $props();
</script>

{@render children()}

<!-- Toast notifications -->
<ToastContainer />
