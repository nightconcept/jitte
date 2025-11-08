<script lang="ts">
	import { onMount } from 'svelte';
	import { deckStore } from '$lib/stores/deck-store';
	import { CardCategory } from '$lib/types/card';
	import ManaSymbolIcon from './ManaSymbolIcon.svelte';

	$: deck = $deckStore?.deck;
	$: statistics = $deckStore?.statistics;
	$: commander = deck?.cards.commander?.[0];
	$: commanderImageUrl = commander?.imageUrls?.artCrop || commander?.imageUrls?.large;

	// Scrolling state
	let scrollY = 0;
	let isScrolled = false;

	onMount(() => {
		const handleScroll = () => {
			scrollY = window.scrollY;
			isScrolled = scrollY > 100;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	// Calculate type distribution
	$: typeDistribution = {
		planeswalker: deck?.cards[CardCategory.Planeswalker]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		creature: deck?.cards[CardCategory.Creature]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		instant: deck?.cards[CardCategory.Instant]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		sorcery: deck?.cards[CardCategory.Sorcery]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		artifact: deck?.cards[CardCategory.Artifact]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		enchantment: deck?.cards[CardCategory.Enchantment]?.reduce((sum, c) => sum + c.quantity, 0) || 0,
		land: deck?.cards[CardCategory.Land]?.reduce((sum, c) => sum + c.quantity, 0) || 0
	};

	$: mainDeckCount = (statistics?.totalCards || 0) - (deck?.cards[CardCategory.Commander]?.reduce((sum, c) => sum + c.quantity, 0) || 0);
</script>

<div class="sticky top-[57px] z-40 transition-all duration-300 {isScrolled ? 'h-16' : 'h-48'}">
	<div class="relative h-full overflow-hidden">
		<!-- Gradient Background with Commander Image -->
		<div class="absolute inset-0 transition-opacity duration-300 {isScrolled ? 'opacity-0' : 'opacity-100'}">
			<!-- Theme-aware gradient from brand color to dark -->
			<div class="absolute inset-0" style="background: linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) 40%, rgba(0,0,0,0.6) 70%, transparent 100%);"></div>

			<!-- Commander card art -->
			{#if commanderImageUrl}
				<img
					src={commanderImageUrl}
					alt={commander?.name || 'Commander'}
					class="absolute inset-0 w-full h-full object-cover object-center opacity-60"
				/>
			{/if}

			<!-- Overlay for readability -->
			<div class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
		</div>

		<!-- Solid background when scrolled -->
		<div class="absolute inset-0 bg-[var(--color-bg-secondary)] transition-opacity duration-300 {isScrolled ? 'opacity-100' : 'opacity-0'}"></div>

		<!-- Content -->
		<div class="relative h-full px-6 flex items-center justify-between {isScrolled ? 'pt-2' : ''}">
			<!-- Left: Deck Info -->
			<div class="transition-all duration-300">
				<h1 class="transition-all duration-300 {isScrolled ? 'text-lg text-[var(--color-text-primary)] mb-0.5 font-semibold' : 'text-3xl text-white mb-1 font-bold'}">
					{deck?.name || 'Untitled Deck'}
				</h1>

				<div class="flex items-center gap-4 text-sm transition-all duration-300 {isScrolled ? 'text-[var(--color-text-secondary)]' : 'text-white/90'}">
					<div>
						<span class="font-semibold">{mainDeckCount}</span> cards
					</div>
					<div class="{isScrolled ? 'text-[var(--color-text-tertiary)]' : 'text-white/50'}">•</div>
					<div class="flex items-center gap-1.5">
						<span class="font-semibold {isScrolled ? 'text-[var(--color-text-primary)]' : 'text-white'}">Branch:</span>
						<span class="font-medium {isScrolled ? 'text-[var(--color-brand-primary)]' : 'text-purple-300'}">{deck?.currentBranch || 'main'}</span>
					</div>
					<div class="{isScrolled ? 'text-[var(--color-text-tertiary)]' : 'text-white/50'}">•</div>
					<div class="flex items-center gap-1.5">
						<span class="font-semibold {isScrolled ? 'text-[var(--color-text-primary)]' : 'text-white'}">Version:</span>
						<span class="font-medium">{deck?.currentVersion || '1.0.0'}</span>
					</div>
				</div>
			</div>

			<!-- Center: Stats (always visible) -->
			<div class="flex items-center gap-6 transition-all duration-300 {isScrolled ? 'text-[var(--color-text-primary)] scale-90' : 'text-white'}">
				<!-- Type Distribution -->
				<div class="flex items-center gap-3">
					<div class="flex items-center gap-1" title="Planeswalkers">
						<ManaSymbolIcon type="planeswalker" />
						<span class="text-sm font-medium">{typeDistribution.planeswalker}</span>
					</div>
					<div class="flex items-center gap-1" title="Creatures">
						<ManaSymbolIcon type="creature" />
						<span class="text-sm font-medium">{typeDistribution.creature}</span>
					</div>
					<div class="flex items-center gap-1" title="Instants">
						<ManaSymbolIcon type="instant" />
						<span class="text-sm font-medium">{typeDistribution.instant}</span>
					</div>
					<div class="flex items-center gap-1" title="Sorceries">
						<ManaSymbolIcon type="sorcery" />
						<span class="text-sm font-medium">{typeDistribution.sorcery}</span>
					</div>
					<div class="flex items-center gap-1" title="Artifacts">
						<ManaSymbolIcon type="artifact" />
						<span class="text-sm font-medium">{typeDistribution.artifact}</span>
					</div>
					<div class="flex items-center gap-1" title="Enchantments">
						<ManaSymbolIcon type="enchantment" />
						<span class="text-sm font-medium">{typeDistribution.enchantment}</span>
					</div>
					<div class="flex items-center gap-1" title="Lands">
						<ManaSymbolIcon type="land" />
						<span class="text-sm font-medium">{typeDistribution.land}</span>
					</div>
				</div>
			</div>

			<!-- Right: Price -->
			<div class="text-right transition-all duration-300">
				<div class="font-bold transition-all duration-300 {isScrolled ? 'text-lg text-green-500' : 'text-2xl text-green-400'}">
					${statistics?.totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
				</div>
				{#if !isScrolled}
					<div class="text-xs text-white/70">Total Deck Value</div>
				{/if}
			</div>
		</div>

	</div>
</div>

<style>
	.theme-button {
		background-color: var(--color-brand-primary);
	}

	.theme-button:hover:not(:disabled) {
		background-color: var(--color-brand-secondary);
	}
</style>
