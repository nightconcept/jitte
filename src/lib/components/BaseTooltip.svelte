<script lang="ts">
	import { type Snippet } from 'svelte';

	let {
		trigger = 'hover',
		position = 'above',
		positioning = 'absolute',
		closeDelay = 300,
		maxWidth = '400px',
		className = '',
		offsetY = 0,
		ariaLabel,
		content,
		children
	}: {
		trigger?: 'hover' | 'click';
		position?: 'above' | 'below';
		positioning?: 'absolute' | 'fixed';
		closeDelay?: number;
		maxWidth?: string;
		className?: string;
		offsetY?: number;
		ariaLabel?: string;
		content?: Snippet;
		children?: Snippet;
	} = $props();

	let isVisible = $state(false);
	let closeTimeout: number | null = null;
	let triggerElement = $state<HTMLElement | null>(null);
	let tooltipPosition = $state({ top: 0, left: 0 });

	function updatePosition() {
		if (triggerElement) {
			const rect = triggerElement.getBoundingClientRect();
			if (positioning === 'fixed') {
				// Fixed positioning - viewport-relative
				tooltipPosition = {
					top: position === 'above' ? rect.top - 8 + offsetY : rect.bottom + 8 + offsetY,
					left: rect.left + rect.width / 2
				};
			} else {
				// Absolute positioning - will be handled by CSS
				tooltipPosition = { top: 0, left: 0 };
			}
		}
	}

	function show() {
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
		isVisible = true;
		if (positioning === 'fixed') {
			updatePosition();
		}
	}

	function hide() {
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
		}
		closeTimeout = window.setTimeout(() => {
			isVisible = false;
			closeTimeout = null;
		}, closeDelay);
	}

	function toggle() {
		if (isVisible) {
			if (closeTimeout !== null) {
				clearTimeout(closeTimeout);
			}
			isVisible = false;
			closeTimeout = null;
		} else {
			show();
		}
	}

	function handleTriggerMouseEnter() {
		if (trigger === 'hover') {
			show();
		}
	}

	function handleTriggerMouseLeave() {
		if (trigger === 'hover') {
			hide();
		}
	}

	function handleTriggerClick() {
		if (trigger === 'click') {
			toggle();
		}
	}

	function handleTooltipMouseEnter() {
		if (closeTimeout !== null) {
			clearTimeout(closeTimeout);
			closeTimeout = null;
		}
	}

	function handleTooltipMouseLeave() {
		hide();
	}
</script>

<span
	bind:this={triggerElement}
	class="tooltip-trigger {positioning === 'absolute' ? 'tooltip-trigger--relative' : ''}"
	role={trigger === 'click' ? 'button' : 'group'}
	tabindex={trigger === 'click' ? 0 : undefined}
	aria-label={ariaLabel}
	aria-expanded={trigger === 'click' ? isVisible : undefined}
	onmouseenter={handleTriggerMouseEnter}
	onmouseleave={handleTriggerMouseLeave}
	onclick={handleTriggerClick}
	onkeydown={(e) => {
		if (trigger === 'click' && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			toggle();
		}
	}}
>
	{#if children}
		{@render children()}
	{/if}

	{#if isVisible}
		<span
			class="base-tooltip base-tooltip--{position} base-tooltip--{positioning} {className}"
			style={positioning === 'fixed'
				? `top: ${tooltipPosition.top}px; left: ${tooltipPosition.left}px; max-width: ${maxWidth};`
				: `max-width: ${maxWidth};`}
			role={trigger === 'click' ? 'button' : 'tooltip'}
			tabindex={trigger === 'click' ? 0 : undefined}
			aria-label={trigger === 'click' ? 'Close tooltip' : undefined}
			onmouseenter={handleTooltipMouseEnter}
			onmouseleave={handleTooltipMouseLeave}
			onclick={trigger === 'click' ? toggle : undefined}
			onkeydown={(e) => {
				if (trigger === 'click' && (e.key === 'Escape' || e.key === 'Enter')) {
					e.preventDefault();
					toggle();
				}
			}}
		>
			{#if content}
				{@render content()}
			{/if}
			<span class="tooltip-arrow"></span>
		</span>
	{/if}
</span>

<style>
	.tooltip-trigger {
		display: inline;
	}

	.tooltip-trigger--relative {
		position: relative;
	}

	/* Base tooltip styling */
	.base-tooltip {
		z-index: 50;
		padding: 8px 12px;
		font-size: 0.875rem;
		line-height: 1.4;
		color: var(--color-text-primary);
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		white-space: normal;
		pointer-events: auto;
	}

	/* Absolute positioning (for inline tooltips) */
	.base-tooltip--absolute {
		position: absolute;
		width: max-content;
	}

	.base-tooltip--absolute.base-tooltip--above {
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	.base-tooltip--absolute.base-tooltip--below {
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
	}

	/* Fixed positioning (for trigger-relative tooltips) */
	.base-tooltip--fixed {
		position: fixed;
	}

	.base-tooltip--fixed.base-tooltip--above {
		transform: translate(-50%, -100%);
	}

	.base-tooltip--fixed.base-tooltip--below {
		transform: translateX(-50%);
	}

	/* Clickable tooltips */
	.base-tooltip[role="button"] {
		cursor: pointer;
	}

	/* Tooltip arrow */
	.tooltip-arrow {
		position: absolute;
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
	}

	/* Arrow for tooltip above trigger */
	.base-tooltip--above .tooltip-arrow {
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-top: 6px solid var(--color-border);
	}

	.base-tooltip--above .tooltip-arrow::after {
		content: '';
		position: absolute;
		top: -7px;
		left: -5px;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-top: 5px solid var(--color-surface);
	}

	/* Arrow for tooltip below trigger */
	.base-tooltip--below .tooltip-arrow {
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border-bottom: 6px solid var(--color-border);
	}

	.base-tooltip--below .tooltip-arrow::after {
		content: '';
		position: absolute;
		top: 1px;
		left: -5px;
		border-left: 5px solid transparent;
		border-right: 5px solid transparent;
		border-bottom: 5px solid var(--color-surface);
	}
</style>
