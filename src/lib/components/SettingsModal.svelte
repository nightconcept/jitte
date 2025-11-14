<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { themeStore } from "$lib/stores/themeStore";
  import type { ThemeName } from "$lib/themes";
  import { resetOnboarding } from "$lib/utils/onboarding";
  import { generateDebugInfo } from "$lib/utils/debugInfo";
  import { toastStore } from "$lib/stores/toast-store";
  import { deckManager } from "$lib/stores/deck-manager";
  import VersioningSettings from "./VersioningSettings.svelte";
  import BaseModal from "./BaseModal.svelte";
  import LicensingModal from "./LicensingModal.svelte";
  import type { VersionScheme } from "$lib/types/version";

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = false }: Props = $props();

  const dispatch = createEventDispatcher<{
    close: void;
    redoOnboarding: void;
  }>();

  let showWipeConfirmation = $state(false);
  let showLicensing = $state(false);

  const themeState = $derived($themeStore);
  const mode = $derived(themeState.mode);
  const name = $derived(themeState.name);

  // Deck manager state for versioning settings
  let deckManagerState = $state($deckManager);

  $effect(() => {
    const unsubscribe = deckManager.subscribe((value) => {
      deckManagerState = value;
    });
    return unsubscribe;
  });

  const currentVersioningScheme = $derived<VersionScheme>(
    deckManagerState?.activeManifest?.versioningScheme || "semantic",
  );
  const hasActiveDeck = $derived(!!deckManagerState?.activeManifest);

  const themes: { value: ThemeName; label: string }[] = [
    { value: "equilibrium-gray", label: "Equilibrium Gray" },
    { value: "tokyo-night", label: "Tokyo Night" },
    { value: "kanagawa", label: "Kanagawa" },
    { value: "rose-pine", label: "Rose Pine" },
  ];

  function handleClose() {
    // Don't close settings modal if a child modal is open
    if (showWipeConfirmation || showLicensing) {
      return;
    }
    dispatch("close");
  }

  function handleWipeData() {
    // Clear all localStorage data
    localStorage.clear();

    // Reload the page to reset the app
    window.location.reload();
  }

  function confirmWipe() {
    showWipeConfirmation = true;
  }

  function cancelWipe() {
    showWipeConfirmation = false;
  }

  function toggleMode() {
    themeStore.toggleMode();
  }

  function selectTheme(themeName: ThemeName) {
    themeStore.setTheme(themeName);
  }

  function handleRedoOnboarding() {
    resetOnboarding();
    dispatch("redoOnboarding");
    dispatch("close");
  }

  async function copyDebugInfo() {
    try {
      const debugInfo = generateDebugInfo();
      await navigator.clipboard.writeText(debugInfo);
      toastStore.success("Debug info copied to clipboard!", 2000);
    } catch (error) {
      console.error("Failed to copy debug info:", error);
      toastStore.error("Failed to copy to clipboard");
    }
  }

  async function handleVersioningSchemeChange(newScheme: VersionScheme) {
    const success = await deckManager.updateVersioningScheme(newScheme);
    if (success) {
      toastStore.success(`Versioning scheme changed to ${newScheme}`, 2000);
    } else {
      toastStore.error("Failed to change versioning scheme");
    }
  }
</script>

<BaseModal
  {isOpen}
  onClose={handleClose}
  title="Settings"
  size="2xl"
  height="max-h-[80vh]"
  contentClass="flex flex-col"
>
  {#snippet children()}
    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto">
      <div class="px-6 py-4 space-y-6">
        <!-- Appearance Section -->
        <div>
          <h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            Appearance
          </h3>
          <div class="space-y-3">
            <!-- Theme Selection -->
            <div>
              <label
                for="theme-select"
                class="block text-sm text-[var(--color-text-secondary)] mb-2"
              >
                Theme
              </label>
              <select
                id="theme-select"
                value={name}
                onchange={(e) =>
                  selectTheme(e.currentTarget.value as ThemeName)}
                class="w-full px-4 py-2 text-sm rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-brand-primary)]/50 focus:border-[var(--color-brand-primary)] focus:outline-none transition-colors"
              >
                {#each themes as theme}
                  <option value={theme.value}>
                    {theme.label}
                  </option>
                {/each}
              </select>
            </div>

            <!-- Light/Dark Mode Toggle -->
            <div>
              <label
                for="mode-toggle-button"
                class="block text-sm text-[var(--color-text-secondary)] mb-2"
              >
                Mode
              </label>
              <button
                id="mode-toggle-button"
                type="button"
                onclick={toggleMode}
                class="w-full px-4 py-2 text-sm rounded border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 text-[var(--color-text-primary)] transition-colors flex items-center justify-between"
              >
                <span>{mode === "dark" ? "Dark Mode" : "Light Mode"}</span>
                {#if mode === "dark"}
                  <!-- Moon icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                {:else}
                  <!-- Sun icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                {/if}
              </button>
            </div>
          </div>
        </div>

        <!-- Versioning Section -->
        {#if hasActiveDeck}
          <div class="pt-4 border-t border-[var(--color-border)]">
            <VersioningSettings
              currentScheme={currentVersioningScheme}
              onSchemeChange={handleVersioningSchemeChange}
            />
          </div>
        {/if}

        <!-- Help & Tutorial Section -->
        <div class="pt-4 border-t border-[var(--color-border)]">
          <h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            Help & Tutorial
          </h3>
          <div class="space-y-2">
            <button
              type="button"
              onclick={handleRedoOnboarding}
              class="w-full px-4 py-2 text-sm text-left rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 transition-colors"
            >
              <div class="font-medium">Redo Onboarding Tutorial</div>
              <div class="text-xs text-[var(--color-text-secondary)] mt-1">
                Learn about branches and versions again
              </div>
            </button>
          </div>
        </div>

        <!-- Data Management Section -->
        <div class="pt-4 border-t border-[var(--color-border)]">
          <h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Data Management
          </h3>
          <div class="space-y-2">
            <button
              type="button"
              onclick={confirmWipe}
              class="w-full px-4 py-2 text-sm text-left rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 hover:border-red-500 transition-colors"
            >
              <div class="font-medium">Wipe All Data</div>
              <div class="text-xs opacity-75 mt-1">
                Clear all decks and settings from browser storage
              </div>
            </button>
          </div>
        </div>

        <!-- App Info Section -->
        <div class="pt-4 border-t border-[var(--color-border)]">
          <h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-3">
            About
          </h3>
          <div class="text-sm text-[var(--color-text-secondary)] space-y-2">
            <div>
              <div class="font-medium text-[var(--color-text-primary)]">
                <a
                  href="https://github.com/nightconcept/jitte"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[var(--color-accent-blue)] hover:underline"
                >
                  Jitte
                </a>
                <span
                  >, Licensed under the <a
                    href="https://opensource.org/licenses/MIT"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[var(--color-accent-blue)] hover:underline"
                    >MIT License</a
                  > © 2025 Danny Solivan</span
                >
              </div>
              <div class="text-xs mt-1">Version {__APP_VERSION__}</div>
            </div>
            <div class="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onclick={copyDebugInfo}
                class="px-3 py-2 text-sm text-left rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 transition-colors flex items-center gap-2"
              >
                <!-- Clipboard icon -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span class="text-[var(--color-text-primary)]"
                  >Copy Debug Info</span
                >
              </button>

              <button
                type="button"
                onclick={() => (showLicensing = true)}
                class="px-3 py-2 text-sm text-left rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 transition-colors"
              >
                <span class="text-[var(--color-text-primary)]"
                  >Third-Party Licenses</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer (outside scrollable area) -->
    <div
      class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end"
    >
      <button
        onclick={handleClose}
        class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
      >
        Close
      </button>
    </div>
  {/snippet}
</BaseModal>

<!-- Wipe Confirmation Modal -->
<BaseModal
  isOpen={showWipeConfirmation}
  onClose={cancelWipe}
  title="⚠️ Wipe All Data?"
  size="md"
>
  {#snippet children()}
    <div class="px-6 py-4">
      <p class="text-sm text-[var(--color-text-secondary)] mt-2">
        This will permanently delete:
      </p>
      <ul
        class="text-sm text-[var(--color-text-secondary)] mt-2 space-y-1 list-disc list-inside"
      >
        <li>All saved decks</li>
        <li>All deck versions and history</li>
        <li>All settings and preferences</li>
      </ul>
      <p class="text-sm text-red-500 font-medium mt-3">
        This action cannot be undone!
      </p>
    </div>

    <div
      class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3"
    >
      <button
        onclick={cancelWipe}
        class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
      >
        Cancel
      </button>
      <button
        onclick={handleWipeData}
        class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-medium"
      >
        Yes, Wipe Everything
      </button>
    </div>
  {/snippet}
</BaseModal>

<!-- Licensing Modal -->
<LicensingModal
  isOpen={showLicensing}
  onClose={() => (showLicensing = false)}
/>
