<script lang="ts">
	import { FORMAT_METADATA, type DeckFormat } from '$lib/formats/format-registry';

	let { format }: { format: DeckFormat } = $props();

	const metadata = $derived(FORMAT_METADATA[format]);
</script>

<span class="format-badge" title={metadata.description}>
	{metadata.displayName}
</span>

<style>
	.format-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}
</style>
