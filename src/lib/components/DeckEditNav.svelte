<script lang="ts">
	/**
	 * Floating deck editing navigation bar with branch/version control and card search
	 * Becomes sticky at top when scrolled
	 */

	import CardSearch from './CardSearch.svelte';

	let {
		currentBranch = 'main',
		currentVersion = '1.0.0',
		availableVersions = [],
		availableBranches = ['main'],
		hasUnsavedChanges = false,
		isNewDeck = false,
		isCommander = false,
		onSave = undefined,
		onSwitchVersion = undefined,
		onSwitchBranch = undefined,
		onNewBranch = undefined,
		onDeleteBranch = undefined,
		onSettings = undefined,
		onRecommendations = undefined
	}: {
		currentBranch?: string;
		currentVersion?: string;
		availableVersions?: string[];
		availableBranches?: string[];
		hasUnsavedChanges?: boolean;
		isNewDeck?: boolean;
		isCommander?: boolean;
		onSave?: (() => void) | undefined;
		onSwitchVersion?: ((version: string) => void) | undefined;
		onSwitchBranch?: ((branch: string) => void) | undefined;
		onNewBranch?: (() => void) | undefined;
		onDeleteBranch?: ((branch: string) => void) | undefined;
		onSettings?: (() => void) | undefined;
		onRecommendations?: (() => void) | undefined;
	} = $props();

	// Save button is enabled if:
	// - Deck is in edit mode AND
	// - Either has unsaved changes OR is a new deck that hasn't been saved yet
	let canSave = $derived(hasUnsavedChanges || isNewDeck);

	// Dropdown state
	let versionDropdownOpen = $state(false);
	let branchDropdownOpen = $state(false);

	// Dropdown refs
	let versionDropdownRef = $state<HTMLDivElement>();
	let branchDropdownRef = $state<HTMLDivElement>();

	// Click outside handler to close dropdowns
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;

			if (
				versionDropdownOpen &&
				versionDropdownRef &&
				!versionDropdownRef.contains(target)
			) {
				versionDropdownOpen = false;
			}

			if (
				branchDropdownOpen &&
				branchDropdownRef &&
				!branchDropdownRef.contains(target)
			) {
				branchDropdownOpen = false;
			}
		}

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
</script>

<nav
	class="sticky top-0 z-40 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3"
>
	<div class="flex items-center justify-between">
		<!-- Left: Branch, Version, Save -->
		<div class="flex items-center gap-3">
			<!-- Branch Selector -->
			<div class="flex items-center gap-2 relative" bind:this={branchDropdownRef}>
				<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Branch:</span>
				<button
					onclick={() => (branchDropdownOpen = !branchDropdownOpen)}
					class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-brand-primary)] font-medium flex items-center gap-2 h-[38px]"
				>
					{currentBranch}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				<!-- Branch Dropdown -->
				{#if branchDropdownOpen && availableBranches.length > 0}
					<div
						class="absolute top-full mt-1 left-0 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50 max-h-64 overflow-y-auto"
					>
						{#each availableBranches as branch}
							<div class="flex items-center hover:bg-[var(--color-surface-hover)]">
								<button
									onclick={() => {
										if (onSwitchBranch) onSwitchBranch(branch);
										branchDropdownOpen = false;
									}}
									class="flex-1 px-4 py-2 text-left text-sm {branch === currentBranch
										? 'text-[var(--color-brand-primary)] font-semibold'
										: 'text-[var(--color-text-primary)]'} flex items-center justify-between"
								>
									<span>{branch}</span>
									{#if branch === currentBranch}
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
								</button>
								{#if branch !== 'main'}
									<button
										onclick={() => {
											if (onDeleteBranch) {
												const confirmed = confirm(
													`Delete branch "${branch}"? This cannot be undone.`
												);
												if (confirmed) {
													onDeleteBranch(branch);
													branchDropdownOpen = false;
												}
											}
										}}
										class="px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-l border-[var(--color-border)]"
										title="Delete branch"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M20 12H4"
											/>
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				<!-- New Branch Button -->
				<button
					onclick={onNewBranch}
					class="px-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-brand-primary)] h-[38px]"
					title="Create new branch"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
			</div>

			<!-- Version Selector -->
			<div class="flex items-center gap-2 relative" bind:this={versionDropdownRef}>
				<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Version:</span>
				<button
					onclick={() => (versionDropdownOpen = !versionDropdownOpen)}
					class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-medium flex items-center gap-2 min-w-[140px] h-[38px]"
				>
					<span>{currentVersion}</span>
					{#if hasUnsavedChanges}
						<span class="text-[var(--color-text-tertiary)] text-xs">(unsaved)</span>
					{/if}
					<svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				<!-- Version Dropdown -->
				{#if versionDropdownOpen && availableVersions.length > 0}
					<div
						class="absolute top-full mt-1 right-0 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50 max-h-64 overflow-y-auto"
					>
						{#each availableVersions.slice().reverse() as version}
							<button
								onclick={() => {
									if (onSwitchVersion) onSwitchVersion(version);
									versionDropdownOpen = false;
								}}
								class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {version ===
								currentVersion
									? 'text-[var(--color-brand-primary)] font-semibold'
									: 'text-[var(--color-text-primary)]'} flex items-center justify-between"
							>
								<span>{version}</span>
								{#if version === currentVersion}
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Save Button -->
			<button
				onclick={onSave}
				disabled={!canSave}
				class="px-4 py-2 text-sm bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[38px]"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
					/>
				</svg>
				Save
			</button>
		</div>

		<!-- Right: Recommendations, Search and Settings -->
		<div class="flex items-center gap-3">
			<!-- Recommendations Button (Commander only) -->
			{#if isCommander}
				<button
					onclick={onRecommendations}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white transition-colors h-[38px] flex items-center gap-2 font-medium text-sm"
					title="Get EDHREC recommendations"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
					Recommendations
				</button>
			{/if}

			<!-- Card Search -->
			<div class="w-96">
				<CardSearch />
			</div>

			<!-- Settings -->
			<button
				onclick={onSettings}
				class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors h-[38px]"
				title="Settings"
			>
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
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
		</div>
	</div>
</nav>
