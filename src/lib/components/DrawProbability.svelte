<script lang="ts">
	interface Props {
		typeDistribution: Record<string, number>;
		totalCards: number;
	}

	let { typeDistribution, totalCards }: Props = $props();

	// State for calculator
	let cardsDrawn = $state(7); // Starting hand

	// Exclude commander and companion from calculations (they start in command zone)
	let adjustedTypeDistribution = $derived(
		Object.fromEntries(
			Object.entries(typeDistribution).filter(
				([type]) => type.toLowerCase() !== 'commander' && type.toLowerCase() !== 'companion'
			)
		)
	);

	// Calculate adjusted deck size (excluding commander/companion)
	let adjustedTotalCards = $derived(
		Object.values(adjustedTypeDistribution).reduce((sum, count) => sum + count, 0)
	);

	// Calculate hypergeometric probability of drawing at least k successes
	function hypergeometric(populationSize: number, successesInPop: number, sampleSize: number, minSuccesses: number): number {
		if (successesInPop === 0 || sampleSize === 0 || populationSize === 0) return 0;
		if (minSuccesses > successesInPop || minSuccesses > sampleSize) return 0;

		// Calculate probability of drawing at least minSuccesses
		// P(X >= k) = 1 - P(X < k) = 1 - P(X <= k-1)
		let probNone = 0;

		// Calculate P(X = 0, 1, 2, ..., minSuccesses-1)
		for (let k = 0; k < minSuccesses; k++) {
			probNone += hypergeometricExact(populationSize, successesInPop, sampleSize, k);
		}

		return Math.max(0, Math.min(1, 1 - probNone));
	}

	// Calculate exact hypergeometric probability P(X = k)
	function hypergeometricExact(N: number, K: number, n: number, k: number): number {
		if (k > K || k > n || (n - k) > (N - K)) return 0;

		return (combination(K, k) * combination(N - K, n - k)) / combination(N, n);
	}

	// Calculate binomial coefficient (n choose k)
	function combination(n: number, k: number): number {
		if (k > n || k < 0) return 0;
		if (k === 0 || k === n) return 1;

		k = Math.min(k, n - k); // Optimization

		let result = 1;
		for (let i = 0; i < k; i++) {
			result *= (n - i);
			result /= (i + 1);
		}

		return result;
	}

	// Calculate probabilities for each card type
	let probabilities = $derived(
		Object.entries(adjustedTypeDistribution)
			.filter(([_, count]) => count > 0)
			.map(([type, count]) => ({
				type,
				count,
				probability: hypergeometric(adjustedTotalCards, count, cardsDrawn, 1) * 100
			}))
			.sort((a, b) => b.probability - a.probability)
	);
</script>

<div class="space-y-4 text-sm sm:text-base">
	<!-- Calculator controls -->
	<div class="bg-[var(--color-surface)] rounded-lg p-4 space-y-3 border border-[var(--color-border)]">
		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
			<span class="font-semibold text-[var(--color-text-primary)]">Probability of drawing</span>
			<div class="flex items-center gap-2 justify-between sm:justify-end text-sm sm:text-base">
				<label class="text-[var(--color-text-secondary)]">Cards drawn:</label>
				<input
					type="number"
					bind:value={cardsDrawn}
					min="0"
					max={adjustedTotalCards}
					class="w-20 px-2 py-1 text-sm sm:text-base bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
				/>
			</div>
		</div>
		<p class="text-[var(--color-text-tertiary)] italic text-xs sm:text-sm">
			at least 1 card from each category
		</p>
	</div>

	<!-- Probability table -->
	<div class="rounded-lg border border-[var(--color-border)] overflow-hidden">
		<div class="grid grid-cols-[1.2fr_0.55fr_0.55fr] gap-2 text-xs sm:text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide bg-[var(--color-surface)] px-4 py-2">
			<div>Category</div>
			<div class="text-right">Qty</div>
			<div class="text-right">Odds</div>
		</div>
		<div class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-primary)]">
			{#each probabilities as { type, count, probability }}
				<div class="grid grid-cols-[1.2fr_0.55fr_0.55fr] gap-2 px-4 py-2 text-sm sm:text-base items-center hover:bg-[var(--color-surface)] transition-colors">
					<div class="text-[var(--color-text-secondary)] capitalize font-medium">{type}</div>
					<div class="text-[var(--color-text-primary)] text-right font-semibold">{count}</div>
					<div class="text-[var(--color-text-primary)] text-right font-semibold">
						{probability.toFixed(1)}%
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
