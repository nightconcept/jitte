<script lang="ts">
	/**
	 * Quantity badge component
	 * Displays a consistent quantity badge across the application
	 */
	let {
		quantity,
		title = undefined,
		position = 'left'
	}: {
		quantity: number;
		title?: string;
		position?: 'left' | 'right' | 'inline';
	} = $props();

	const displayTitle = title || `Quantity: ${quantity}`;
</script>

{#if position === 'inline'}
	<span class="badge badge-quantity" title={displayTitle}>{quantity}×</span>
{:else}
	<div class="badge-container badge-container-{position}">
		<span class="badge badge-quantity" title={displayTitle}>{quantity}×</span>
	</div>
{/if}

<style>
	.badge-container {
		position: absolute;
		top: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		z-index: 10;
	}

	.badge-container-left {
		left: 0.25rem;
		align-items: flex-start;
	}

	.badge-container-right {
		right: 0.25rem;
		align-items: flex-end;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 700;
		backdrop-filter: blur(4px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.badge-quantity {
		background: rgba(107, 114, 128, 0.9);
		color: rgb(0, 0, 0);
		border: 1px solid rgba(107, 114, 128, 1);
	}
</style>
