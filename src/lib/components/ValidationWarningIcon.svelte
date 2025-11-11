<script lang="ts">
	import type { ValidationWarning } from '$lib/types/card';
	import BaseTooltip from './BaseTooltip.svelte';

	let {
		warning,
		position = 'above'
	}: {
		warning: ValidationWarning;
		position?: 'above' | 'below';
	} = $props();

	const severityStyles = {
		error: 'text-red-500',
		warning: 'text-yellow-500',
		info: 'text-blue-500'
	};

	const severityIcons = {
		error: '⚠',
		warning: '⚠',
		info: 'ℹ'
	};
</script>

<BaseTooltip trigger="hover" {position} positioning="absolute" closeDelay={200}>
	{#snippet children()}
		<span class="inline-flex items-center justify-center w-4 h-4 text-xs {severityStyles[warning.severity]}" title={warning.message}>
			{severityIcons[warning.severity]}
		</span>
	{/snippet}
	{#snippet content()}
		{warning.message}
	{/snippet}
</BaseTooltip>
