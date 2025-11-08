<script lang="ts">
	import type { ValidationWarning } from '$lib/types/card';
	import Tooltip from './Tooltip.svelte';

	let {
		warning,
		position = 'top'
	}: {
		warning: ValidationWarning;
		position?: 'top' | 'bottom' | 'left' | 'right';
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

<Tooltip message={warning.message} {position}>
	<span class="inline-flex items-center justify-center w-4 h-4 text-xs {severityStyles[warning.severity]}" title={warning.message}>
		{severityIcons[warning.severity]}
	</span>
</Tooltip>
