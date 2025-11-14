<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;
  export let title = "Error Details";
  export let message = "";
  export let details = "";

  const dispatch = createEventDispatcher<{ close: void }>();

  function handleClose() {
    dispatch("close");
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      handleClose();
    }
  }

  function copyToClipboard() {
    const fullError = `${message}\n\nDetails:\n${details}`;
    navigator.clipboard.writeText(fullError);
  }
</script>

{#if isOpen}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    onkeydown={handleKeydown}
    role="presentation"
  >
    <!-- Modal Content -->
    <div
      class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-red-700"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-red-700 bg-red-900/20">
        <h2 class="text-xl font-bold text-red-400 flex items-center gap-2">
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {title}
        </h2>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
        <!-- Error Message -->
        <div class="mb-4">
          <h3
            class="text-sm font-semibold text-[var(--color-text-primary)] mb-2"
          >
            Error Message:
          </h3>
          <div
            class="p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] text-red-400"
          >
            {message}
          </div>
        </div>

        <!-- Error Details -->
        <div>
          <h3
            class="text-sm font-semibold text-[var(--color-text-primary)] mb-2"
          >
            Details:
          </h3>
          <div
            class="p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] font-mono text-xs whitespace-pre-wrap break-all"
          >
            {details}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between"
      >
        <button
          onclick={copyToClipboard}
          class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] flex items-center gap-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy to Clipboard
        </button>
        <button
          onclick={handleClose}
          class="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
