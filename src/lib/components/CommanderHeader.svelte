<script lang="ts">
	import { deckStore } from '$lib/stores/deck-store';
	import { CardCategory } from '$lib/types/card';
	import ManaSymbolIcon from './ManaSymbolIcon.svelte';

	$: deck = $deckStore?.deck;
	$: statistics = $deckStore?.statistics;
	$: commander = deck?.cards.commander?.[0];
	$: commanderImageUrl = commander?.imageUrls?.artCrop || commander?.imageUrls?.large;

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

	$: mainDeckCount = statistics?.totalCards || 0;
</script>

<!-- Compact Fixed Header -->
<div class="sticky top-[57px] z-40 h-16">
	<div class="relative h-full overflow-hidden">
		<!-- Solid background -->
		<div class="absolute inset-0 bg-[var(--color-bg-secondary)]"></div>

		<!-- Content -->
		<div class="relative h-full px-6 flex items-center justify-between">
			<!-- Left: Deck Info -->
			<div>
				<h1 class="text-lg text-[var(--color-text-primary)] font-semibold">
					{deck?.name || 'Untitled Deck'}
				</h1>

				<div class="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
					<div>
						<span class="font-semibold">{mainDeckCount}</span> cards
					</div>
				</div>
			</div>

			<!-- Center: Stats -->
			<div class="flex items-center gap-6 text-[var(--color-text-primary)]">
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
			<div class="text-right">
				<div class="font-bold text-lg text-green-500">
					${statistics?.totalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
				</div>
			</div>
		</div>
	</div>
</div>
