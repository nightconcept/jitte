<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { themeStore } from '$lib/stores/themeStore';
	import type { ThemeName } from '$lib/themes';
	import { resetOnboarding } from '$lib/utils/onboarding';

	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		redoOnboarding: void;
	}>();

	let showWipeConfirmation = $state(false);

	const themeState = $derived($themeStore);
	const mode = $derived(themeState.mode);
	const name = $derived(themeState.name);

	const themes: { value: ThemeName; label: string }[] = [
		{ value: 'tokyo-night', label: 'Tokyo Night' },
		{ value: 'kanagawa', label: 'Kanagawa' },
		{ value: 'rose-pine', label: 'Rose Pine' }
	];

	function handleClose() {
		showWipeConfirmation = false;
		dispatch('close');
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
		dispatch('redoOnboarding');
		dispatch('close');
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		on:click={handleClose}
		role="presentation"
	>
		<!-- Modal Content -->
		<div
			class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-[var(--color-border)]">
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Settings</h2>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 space-y-4">
				<!-- Appearance Section -->
				<div>
					<h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-3">
						Appearance
					</h3>
					<div class="space-y-3">
						<!-- Theme Selection -->
						<div>
							<label class="block text-sm text-[var(--color-text-secondary)] mb-2">
								Theme
							</label>
							<div class="grid grid-cols-3 gap-2">
								{#each themes as theme}
									<button
										type="button"
										on:click={() => selectTheme(theme.value)}
										class="px-4 py-2 text-sm rounded border transition-colors {name === theme.value
											? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]'
											: 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 text-[var(--color-text-primary)]'}"
									>
										{theme.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Light/Dark Mode Toggle -->
						<div>
							<label class="block text-sm text-[var(--color-text-secondary)] mb-2">
								Mode
							</label>
							<button
								type="button"
								on:click={toggleMode}
								class="w-full px-4 py-2 text-sm rounded border border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50 text-[var(--color-text-primary)] transition-colors flex items-center justify-between"
							>
								<span>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
								{#if mode === 'dark'}
									<!-- Moon icon -->
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
									</svg>
								{:else}
									<!-- Sun icon -->
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
									</svg>
								{/if}
							</button>
						</div>
					</div>
				</div>

				<!-- Help & Tutorial Section -->
				<div class="pt-4 border-t border-[var(--color-border)]">
					<h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-3">
						Help & Tutorial
					</h3>
					<div class="space-y-2">
						<button
							type="button"
							on:click={handleRedoOnboarding}
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
							on:click={confirmWipe}
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
					<h3 class="text-sm font-medium text-[var(--color-text-primary)] mb-2">
						About
					</h3>
					<div class="text-sm text-[var(--color-text-secondary)] space-y-1">
						<div>Jitte - MTG Commander Deck Manager</div>
						<div class="text-xs">Version 0.1.0</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
				<button
					on:click={handleClose}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Close
				</button>
			</div>
		</div>
	</div>

	<!-- Wipe Confirmation Modal -->
	{#if showWipeConfirmation}
		<div
			class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]"
			on:click={cancelWipe}
			role="presentation"
		>
			<div
				class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full mx-4 border border-[var(--color-border)]"
				on:click|stopPropagation
				role="dialog"
				aria-modal="true"
				tabindex="-1"
			>
				<div class="px-6 py-4">
					<h3 class="text-lg font-bold text-red-500">⚠️ Wipe All Data?</h3>
					<p class="text-sm text-[var(--color-text-secondary)] mt-2">
						This will permanently delete:
					</p>
					<ul class="text-sm text-[var(--color-text-secondary)] mt-2 space-y-1 list-disc list-inside">
						<li>All saved decks</li>
						<li>All deck versions and history</li>
						<li>All settings and preferences</li>
					</ul>
					<p class="text-sm text-red-500 font-medium mt-3">
						This action cannot be undone!
					</p>
				</div>

				<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
					<button
						on:click={cancelWipe}
						class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
					>
						Cancel
					</button>
					<button
						on:click={handleWipeData}
						class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white font-medium"
					>
						Yes, Wipe Everything
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
