<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		complete: void;
	}>();

	let currentStep = $state(0);
	const totalSteps = 2;

	const steps = [
		{
			title: 'Understanding Branches',
			subtitle: 'Different paths for your deck',
			content: `Think of branches as **different versions or directions** your deck can take.

For example, you might start with a **toolbox** deck on the main branch. Then you decide to explore a **stax** strategy — create a new branch called "stax" to experiment!

**Branches let you:**
- Try completely different strategies without losing your original deck
- Keep multiple variations of the same deck (e.g., "budget", "competitive", "casual")
- Switch between different deck archetypes easily

**When to use branches:**
- When you want to take your deck in a significantly different direction
- When experimenting with a new theme or strategy
- When creating budget vs. optimized versions`,
			icon: `<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
			</svg>`
		},
		{
			title: 'Understanding Versions',
			subtitle: 'Small iterations on the same path',
			content: `Versions are like **saved checkpoints** as you refine your deck. They track smaller changes while staying on the same theme.

For example, on your "stax" branch, you might:
- v1.0.0: Initial stax build
- v1.1.0: Added more mana rocks
- v1.2.0: Swapped a few hate pieces
- v2.0.0: Major overhaul of removal suite

**Versions let you:**
- Track your deck's evolution over time
- Roll back to previous configurations if needed
- See what changes you made between iterations
- Maintain a history of your deck-building decisions

**When to use versions:**
- After making small tweaks or improvements
- When testing new cards in the same strategy
- To save milestones as you refine your deck`,
			icon: `<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>`
		}
	];

	function handleNext() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
		} else {
			handleComplete();
		}
	}

	function handlePrevious() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function handleSkip() {
		dispatch('close');
	}

	function handleComplete() {
		dispatch('complete');
	}
</script>

{#if isOpen}
	<!-- Darkened Overlay -->
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]"
		role="presentation"
	>
		<!-- Onboarding Card -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-2xl max-w-2xl w-full mx-4 border border-[var(--color-border)]"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold text-[var(--color-text-primary)]">
							{steps[currentStep].title}
						</h2>
						<p class="text-sm text-[var(--color-text-secondary)] mt-1">
							{steps[currentStep].subtitle}
						</p>
					</div>
					<button
						on:click={handleSkip}
						class="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
						title="Skip onboarding"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-8">
				<!-- Icon -->
				<div class="flex justify-center mb-6 text-[var(--color-brand-primary)]">
					{@html steps[currentStep].icon}
				</div>

				<!-- Content -->
				<div class="prose prose-invert max-w-none">
					<div class="text-[var(--color-text-primary)] space-y-4 text-base leading-relaxed">
						{@html steps[currentStep].content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--color-brand-primary)]">$1</strong>').replace(/\n/g, '<br>')}
					</div>
				</div>

				<!-- Step Indicators -->
				<div class="flex justify-center gap-2 mt-8">
					{#each Array(totalSteps) as _, index}
						<div
							class="h-2 rounded-full transition-all {index === currentStep
								? 'w-8 bg-[var(--color-brand-primary)]'
								: 'w-2 bg-[var(--color-border)]'}"
						></div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between">
				<button
					on:click={handlePrevious}
					disabled={currentStep === 0}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Previous
				</button>

				<div class="flex gap-3">
					<button
						on:click={handleSkip}
						class="px-4 py-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
					>
						Skip Tutorial
					</button>

					<button
						on:click={handleNext}
						class="px-6 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white font-medium transition-colors"
					>
						{currentStep === totalSteps - 1 ? "Let's Go!" : 'Next'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
