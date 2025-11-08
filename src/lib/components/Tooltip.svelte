<script lang="ts">
	let {
		message,
		position = 'top'
	}: {
		message: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
	} = $props();

	let isVisible = $state(false);

	const positionClasses = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--color-surface)]',
		bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--color-surface)]',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--color-surface)]',
		right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--color-surface)]'
	};
</script>

<div
	class="relative inline-flex"
	onmouseenter={() => (isVisible = true)}
	onmouseleave={() => (isVisible = false)}
	role="tooltip"
>
	<!-- Tooltip trigger (slot content) -->
	<slot />

	<!-- Tooltip content -->
	{#if isVisible}
		<div
			class="absolute z-50 px-3 py-2 text-sm text-white bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg whitespace-nowrap pointer-events-none {positionClasses[
				position
			]}"
		>
			{message}
			<!-- Arrow -->
			<div
				class="absolute w-0 h-0 border-4 border-transparent {arrowClasses[position]}"
			></div>
		</div>
	{/if}
</div>
