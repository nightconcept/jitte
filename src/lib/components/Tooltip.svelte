<script lang="ts">
	import { type Snippet } from 'svelte';

	let {
		message,
		position = 'top',
		underlineStyle = 'none',
		hideDelay = 0,
		interactive = false,
		maxWidth,
		trigger,
		content,
		children
	}: {
		message?: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		underlineStyle?: 'none' | 'dashed' | 'solid';
		hideDelay?: number;
		interactive?: boolean;
		maxWidth?: string;
		trigger?: Snippet;
		content?: Snippet;
		children?: Snippet;
	} = $props();

	let isVisible = $state(false);
	let hideTimeout: number | null = null;

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

	const underlineClasses = {
		none: '',
		dashed: 'border-b border-dashed border-current',
		solid: 'border-b border-solid border-current'
	};

	function handleMouseEnter() {
		if (hideTimeout !== null) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
		isVisible = true;
	}

	function handleMouseLeave() {
		if (hideDelay > 0) {
			hideTimeout = window.setTimeout(() => {
				isVisible = false;
				hideTimeout = null;
			}, hideDelay);
		} else {
			isVisible = false;
		}
	}
</script>

<div
	class="relative inline-flex {underlineClasses[underlineStyle]}"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="tooltip"
>
	<!-- Tooltip trigger -->
	{#if trigger}
		{@render trigger()}
	{:else if children}
		{@render children()}
	{/if}

	<!-- Tooltip content -->
	{#if isVisible}
		<div
			class="absolute z-50 px-3 py-2 text-sm text-white bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-lg {positionClasses[
				position
			]} {interactive ? '' : 'pointer-events-none'} {maxWidth ? '' : 'whitespace-nowrap'}"
			style={maxWidth ? `max-width: ${maxWidth}` : ''}
			onmouseenter={interactive ? handleMouseEnter : undefined}
			onmouseleave={interactive ? handleMouseLeave : undefined}
		>
			{#if content}
				{@render content()}
			{:else if message}
				{message}
			{/if}
			<!-- Arrow -->
			<div
				class="absolute w-0 h-0 border-4 border-transparent {arrowClasses[position]}"
			></div>
		</div>
	{/if}
</div>
