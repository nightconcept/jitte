<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import '$lib/utils/consoleCapture'; // Initialize console capture

	const { children } = $props();
</script>

<div class="flex flex-col min-h-screen">
	<div class="flex-1">
		{@render children()}
	</div>
	<Footer />
</div>

<!-- Toast notifications -->
<ToastContainer />
