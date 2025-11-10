<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import '$lib/utils/consoleCapture'; // Initialize console capture

	const { children } = $props();
</script>

{@render children()}

<!-- Toast notifications -->
<ToastContainer />
