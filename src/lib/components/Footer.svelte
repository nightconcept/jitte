<script lang="ts">
  import LicensingModal from "./LicensingModal.svelte";

  let licensingModalOpen = $state(false);
</script>

<footer
  class="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]"
>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-4">
    <!-- Legal Disclaimer -->
    <div class="text-xs space-y-2">
      <p>
        Wizards of the Coast, Magic: The Gathering, and their logos are
        trademarks of Wizards of the Coast LLC in the United States and other
        countries. © 1993-2025 Wizards. All Rights Reserved.
      </p>
      <p>
        Jitte is not affiliated with, endorsed, sponsored, or specifically
        approved by Wizards of the Coast LLC. Jitte may use the trademarks and
        other intellectual property of Wizards of the Coast LLC, which is
        permitted under Wizards' Fan Content Policy. MAGIC: THE GATHERING® is a
        trademark of Wizards of the Coast. For more information about Wizards of
        the Coast or any of Wizards' trademarks or other intellectual property,
        please visit their website at <a
          href="https://company.wizards.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline"
          >https://company.wizards.com/</a
        >.
      </p>
      <p>
        Card data from <a
          href="https://scryfall.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline">Scryfall</a
        >
        ,
        <a
          href="https://commanderspellbook.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline"
          >Commander's Spellbook</a
        >
        , and
        <a
          href="https://edhrec.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline">EDHREC</a
        >. Prices from
        <a
          href="https://www.tcgplayer.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline">TCG Player</a
        >,
        <a
          href="https://www.cardkingdom.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline"
          >Card Kingdom</a
        >, and
        <a
          href="https://manapool.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline">Mana Pool</a
        >
        obtained through Scryfall.
      </p>
    </div>

    <!-- Footer Links and Copyright -->
    <div
      class="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs border-t border-[var(--color-border)] pt-4"
    >
      <div class="flex items-center gap-3">
        <span>© 2025 nightconcept</span>
        <span>·</span>
        <button
          onclick={() => (licensingModalOpen = true)}
          class="text-[var(--color-accent-blue)] hover:underline"
        >
          Licensing Information
        </button>
        <span>·</span>
        <a
          href="https://github.com/nightconcept/jitte"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent-blue)] hover:underline"
        >
          GitHub
        </a>
      </div>
      <div class="text-[var(--color-text-tertiary)]">
        Version {__APP_VERSION__}
      </div>
    </div>
  </div>
</footer>

<LicensingModal
  isOpen={licensingModalOpen}
  onClose={() => (licensingModalOpen = false)}
/>
