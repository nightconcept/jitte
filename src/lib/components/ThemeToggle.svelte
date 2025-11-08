<script lang="ts">
	import { themeStore } from '$lib/stores/themeStore';
	import type { ThemeName } from '$lib/themes';

	const { mode, name } = $derived($themeStore);

	let showThemePicker = $state(false);

	const themes: { value: ThemeName; label: string }[] = [
		{ value: 'tokyo-night', label: 'Tokyo Night' },
		{ value: 'kanagawa', label: 'Kanagawa' },
		{ value: 'rose-pine', label: 'Rose Pine' }
	];

	function toggleMode() {
		themeStore.toggleMode();
	}

	function selectTheme(themeName: ThemeName) {
		themeStore.setTheme(themeName);
		showThemePicker = false;
	}

	function toggleThemePicker() {
		showThemePicker = !showThemePicker;
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.theme-picker-container')) {
			showThemePicker = false;
		}
	}

	$effect(() => {
		if (showThemePicker) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="flex items-center gap-2">
	<!-- Theme Picker Dropdown -->
	<div class="theme-picker-container relative">
		<button
			onclick={toggleThemePicker}
			class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
			title="Select theme"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
			</svg>
			<span class="text-sm font-medium hidden sm:inline">
				{themes.find(t => t.value === name)?.label}
			</span>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if showThemePicker}
			<div class="absolute right-0 mt-2 w-48 bg-[var(--color-bg-elevated)] rounded-lg shadow-lg border border-[var(--color-border)] overflow-hidden z-50">
				{#each themes as theme}
					<button
						onclick={() => selectTheme(theme.value)}
						class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] transition-colors flex items-center justify-between"
						class:bg-[var(--color-surface)]={name === theme.value}
						class:text-[var(--color-brand-primary)]={name === theme.value}
						class:text-[var(--color-text-primary)]={name !== theme.value}
					>
						<span>{theme.label}</span>
						{#if name === theme.value}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Light/Dark Mode Toggle -->
	<button
		onclick={toggleMode}
		class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
		title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	>
		{#if mode === 'dark'}
			<!-- Sun icon for switching to light mode -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
		{:else}
			<!-- Moon icon for switching to dark mode -->
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
			</svg>
		{/if}
	</button>
</div>
