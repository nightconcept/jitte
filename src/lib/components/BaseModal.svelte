<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	let {
		isOpen = false,
		onClose,
		title,
		subtitle,
		size = 'md',
		height,
		contentClass = '',
		children
	}: {
		isOpen?: boolean;
		onClose?: () => void;
		title?: string;
		subtitle?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
		height?: string;
		contentClass?: string;
		children?: Snippet;
	} = $props();

	// Size mapping for Tailwind classes
	const sizeClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		'3xl': 'max-w-3xl',
		'4xl': 'max-w-4xl',
		full: 'max-w-full'
	};

	function handleBackdropClick() {
		if (onClose) onClose();
	}

	function handleClose() {
		if (onClose) onClose();
	}

	// ESC key handler
	$effect(() => {
		if (!isOpen) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				handleClose();
			}
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		role="presentation"
		onclick={handleBackdropClick}
		transition:fade={{ duration: 50 }}
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl {sizeClasses[
				size
			]} w-full mx-4 border border-[var(--color-border)] relative flex flex-col {height || ''} {contentClass}"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			transition:fade={{ duration: 50, delay: 25 }}
		>
			<!-- Close Button (X) in top right -->
			{#if onClose}
				<button
					onclick={handleClose}
					class="absolute top-4 right-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors z-10"
					aria-label="Close modal"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}

			<!-- Header (if title provided) -->
			{#if title}
				<div class="px-6 py-4 border-b border-[var(--color-border)] pr-12">
					<h2 class="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
					{#if subtitle}
						<p class="text-sm text-[var(--color-text-secondary)] mt-1">{subtitle}</p>
					{/if}
				</div>
			{/if}

			<!-- Modal Content (Snippet) -->
			<div class="modal-content flex-1 min-h-0 overflow-hidden flex flex-col">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
{/if}
