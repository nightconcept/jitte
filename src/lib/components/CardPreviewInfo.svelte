<script lang="ts">
  import type { Card } from "$lib/types/card";
  import type { ScryfallCard, ScryfallSet } from "$lib/types/scryfall";
  import ManaSymbol from "./ManaSymbol.svelte";
  import OracleText from "./OracleText.svelte";
  import BaseTooltip from "./BaseTooltip.svelte";
  import { cardService } from "$lib/api/card-service";
  import { formatSetReleaseDate } from "$lib/utils/date-format";

  let {
    card,
    scryfallCard,
  }: {
    card: Card;
    scryfallCard: ScryfallCard;
  } = $props();

  let setData = $state<ScryfallSet | null>(null);
  let setLoading = $state(false);

  // Check if this is a double-faced card
  let isDoubleFaced = $derived(
    scryfallCard.card_faces && scryfallCard.card_faces.length > 1
  );

  // Parse pricing from scryfallCard
  let normalPrice = $derived(
    scryfallCard.prices?.usd ? parseFloat(scryfallCard.prices.usd) : undefined
  );
  let foilPrice = $derived(
    scryfallCard.prices?.usd_foil ? parseFloat(scryfallCard.prices.usd_foil) : undefined
  );

  async function loadSetData() {
    if (setData || setLoading) return;
    setLoading = true;
    setData = await cardService.getSetByCode(scryfallCard.set);
    setLoading = false;
  }

  function formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  }
</script>

<!-- Card Info Container -->
<div
  class="bg-[var(--color-surface)] rounded-lg p-4 border border-[var(--color-border)] space-y-3"
>
  {#if isDoubleFaced && scryfallCard.card_faces}
    <!-- Double-Faced Card: Show both faces -->
    {#each scryfallCard.card_faces as face, index}
      <!-- Face Header with separator -->
      {#if index > 0}
        <div class="border-t-2 border-[var(--color-border)] pt-3 mt-3"></div>
      {/if}

      <!-- Face Name & Mana Cost -->
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-lg font-bold text-[var(--color-text-primary)]">
          {face.name}
        </h3>
        {#if face.mana_cost}
          <ManaSymbol cost={face.mana_cost} size="lg" />
        {/if}
      </div>

      <!-- Face Type Line -->
      {#if face.type_line}
        <p class="text-sm font-semibold text-[var(--color-text-primary)]">
          {face.type_line}
        </p>
      {/if}

      <!-- Face Oracle Text -->
      {#if face.oracle_text}
        <div class="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          <OracleText text={face.oracle_text} />
        </div>
      {/if}

      <!-- Face Flavor Text -->
      {#if face.flavor_text}
        <div class="text-sm text-[var(--color-text-tertiary)] leading-relaxed italic">
          {face.flavor_text}
        </div>
      {/if}

      <!-- Face Power/Toughness or Loyalty -->
      {#if face.power && face.toughness}
        <div class="text-lg font-bold text-[var(--color-text-primary)]">
          {face.power} / {face.toughness}
        </div>
      {:else if face.loyalty}
        <div class="text-lg font-bold text-[var(--color-text-primary)]">
          Loyalty: {face.loyalty}
        </div>
      {/if}
    {/each}

    <!-- Set Information (shared for all faces) -->
    <div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-3 mt-3">
      <i
        class="ss ss-{scryfallCard.set.toLowerCase()} ss-{scryfallCard.rarity} ss-grad ss-2x"
        title="{scryfallCard.set_name} - {scryfallCard.rarity}"
      ></i>
      <span>
        <span onmouseenter={loadSetData} role="group">
          <BaseTooltip trigger="hover" position="below" positioning="absolute" closeDelay={200}>
            {#snippet children()}
              <span class="border-b border-dashed border-current cursor-help">
                {scryfallCard.set_name}
              </span>
            {/snippet}
            {#snippet content()}
              {#if setData}
                <div class="text-left">
                  <div>Released: {formatSetReleaseDate(setData.released_at)}</div>
                  <div>{setData.card_count} cards in set</div>
                </div>
              {:else}
                <div>Loading...</div>
              {/if}
            {/snippet}
          </BaseTooltip>
        </span>
        ({scryfallCard.set.toUpperCase()}) #{scryfallCard.collector_number}
      </span>
    </div>
  {:else}
    <!-- Single-Faced Card: Show normal card info -->
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
      <span>
        <span onmouseenter={loadSetData} role="group">
          <BaseTooltip trigger="hover" position="below" positioning="absolute" closeDelay={200}>
            {#snippet children()}
              <span class="border-b border-dashed border-current cursor-help">
                {scryfallCard.set_name}
              </span>
            {/snippet}
            {#snippet content()}
              {#if setData}
                <div class="text-left">
                  <div>Released: {formatSetReleaseDate(setData.released_at)}</div>
                  <div>{setData.card_count} cards in set</div>
                </div>
              {:else}
                <div>Loading...</div>
              {/if}
            {/snippet}
          </BaseTooltip>
        </span>
        ({scryfallCard.set.toUpperCase()}) #{scryfallCard.collector_number}
      </span>
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
  {/if}

  <!-- Pricing Section -->
  <div class="border-t border-[var(--color-border)] pt-3">
    <h4 class="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Pricing (USD)</h4>
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div class="flex justify-between p-2 bg-[var(--color-bg-secondary)] rounded">
        <span class="text-[var(--color-text-secondary)]">Normal:</span>
        <span class="font-semibold text-[var(--color-text-primary)]">
          {formatPrice(normalPrice)}
        </span>
      </div>
      <div class="flex justify-between p-2 bg-[var(--color-bg-secondary)] rounded">
        <span class="text-[var(--color-text-secondary)]">Foil:</span>
        <span class="font-semibold text-[var(--color-text-primary)]">
          {formatPrice(foilPrice)}
        </span>
      </div>
    </div>
  </div>
</div>
