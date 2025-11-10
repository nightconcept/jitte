<script lang="ts">
  import type { Card } from "$lib/types/card";
  import type { ScryfallCard } from "$lib/types/scryfall";
  import ManaSymbol from "./ManaSymbol.svelte";
  import OracleText from "./OracleText.svelte";

  let {
    card,
    scryfallCard,
  }: {
    card: Card;
    scryfallCard: ScryfallCard;
  } = $props();
</script>

<!-- Card Info Container -->
<div
  class="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)] space-y-3"
>
  <!-- Card Name & Mana Cost -->
  <div class="flex items-start justify-between gap-3">
    <h3 class="text-lg font-bold text-[var(--color-text-primary)]">
      {card.name}
    </h3>
    {#if scryfallCard.mana_cost}
      <ManaSymbol cost={scryfallCard.mana_cost} size="lg" />
    {/if}
  </div>

  <!-- Type Line -->
  <p class="text-sm font-semibold text-[var(--color-text-primary)]">
    {scryfallCard.type_line}
  </p>

  <!-- Set Information -->
  <div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
    <i
      class="ss ss-{scryfallCard.set.toLowerCase()} ss-{scryfallCard.rarity} ss-grad ss-2x"
      title="{scryfallCard.set_name} - {scryfallCard.rarity}"
    ></i>
    <span
      >{scryfallCard.set_name} ({scryfallCard.set.toUpperCase()}) #{scryfallCard.collector_number}</span
    >
  </div>

  <!-- Oracle Text -->
  {#if scryfallCard.oracle_text}
    <div
      class="text-sm text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border)] pt-3"
    >
      <OracleText text={scryfallCard.oracle_text} />
    </div>
  {/if}

  <!-- Flavor Text -->
  {#if scryfallCard.flavor_text}
    <div
      class="text-sm text-[var(--color-text-tertiary)] leading-relaxed italic border-t border-[var(--color-border)] pt-2 mt-2"
    >
      {scryfallCard.flavor_text}
    </div>
  {/if}

  <!-- Power/Toughness or Loyalty -->
  {#if scryfallCard.power && scryfallCard.toughness}
    <div class="text-lg font-bold text-[var(--color-text-primary)]">
      {scryfallCard.power} / {scryfallCard.toughness}
    </div>
  {:else if scryfallCard.loyalty}
    <div class="text-lg font-bold text-[var(--color-text-primary)]">
      Loyalty: {scryfallCard.loyalty}
    </div>
  {/if}
</div>
