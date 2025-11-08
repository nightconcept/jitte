<script lang="ts">
	/**
	 * Top navigation bar with Jitte logo and main actions
	 */

	export let isEditing = false;
	export let hasUnsavedChanges = false;
	export let currentBranch = 'main';
	export let currentVersion = '1.0.0';
	export let hasDeck = false;
	export let onToggleEdit: (() => void) | undefined = undefined;
	export let onSave: (() => void) | undefined = undefined;
	export let onNewDeck: (() => void) | undefined = undefined;
	export let onLoadDeck: (() => void) | undefined = undefined;
	export let onSettings: (() => void) | undefined = undefined;
	export let onNewBranch: (() => void) | undefined = undefined;
	export let onExport: (() => void) | undefined = undefined;
	export let onImport: (() => void) | undefined = undefined;
</script>

<nav class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3 sticky top-0 z-50">
	<div class="flex items-center justify-between">
		<!-- Left: Logo and Actions -->
		<div class="flex items-center gap-3">
			<!-- Jitte Logo/Icon -->
			<div class="flex items-center gap-2">
				<div class="w-[38px] h-[38px] rounded flex items-center justify-center font-bold text-white" style="background: linear-gradient(to bottom right, var(--color-brand-primary), var(--color-accent-purple));">
					<!-- Jitte SVG Icon - Simplified comic style -->
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
						<!-- Continuous shaft from top to bottom -->
						<rect x="11.2" y="3" width="1.6" height="19" rx="0.4"/>

						<!-- Small nub/tip at top -->
						<circle cx="12" cy="2.8" r="0.6"/>

						<!-- Single hook (kagi) - perpendicular then parallel (flipped to look like 'j') -->
						<path d="M11 15.5 L8 15.5 L8 11.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

						<!-- Pommel at bottom -->
						<circle cx="12" cy="22.2" r="0.8"/>
					</svg>
				</div>
				<span class="text-lg font-bold text-[var(--color-text-primary)]">Jitte</span>
			</div>

			<!-- Divider -->
			<div class="h-6 w-px bg-[var(--color-border)]"></div>

			<!-- New Deck -->
			<button
				on:click={onNewDeck}
				class="px-3 py-2 text-sm rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white font-medium flex items-center gap-2 h-[38px]"
				title="Create New Deck"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New
			</button>

			<!-- Load Deck -->
			<button
				on:click={onLoadDeck}
				class="px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2 h-[38px]"
				title="Load Existing Deck"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
				</svg>
				Load
			</button>

			{#if hasDeck}
				<!-- Divider -->
				<div class="h-6 w-px bg-[var(--color-border)]"></div>

				<!-- Export Deck -->
				<button
					on:click={onExport}
					class="px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2 h-[38px]"
					title="Export to Plaintext"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					Export
				</button>

				<!-- Import Deck -->
				<button
					on:click={onImport}
					class="px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2 h-[38px]"
					title="Import from Plaintext"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Import
				</button>
			{/if}
		</div>

		<!-- Center: Branch, Version, and Mode Controls -->
		{#if hasDeck}
			<div class="flex items-center gap-3">
				<!-- Branch Selector -->
				<div class="flex items-center gap-2">
					<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Branch:</span>
					<button class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-brand-primary)] font-medium flex items-center gap-2 h-[38px]">
						{currentBranch}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					<!-- New Branch Button -->
					<button
						on:click={onNewBranch}
						class="px-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-brand-primary)] h-[38px]"
						title="Create new branch"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</button>
				</div>

				<!-- Version Selector -->
				<div class="flex items-center gap-2">
					<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Version:</span>
					<button class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-medium flex items-center gap-2 min-w-[140px] h-[38px]">
						<span>{currentVersion}</span>
						{#if hasUnsavedChanges}
							<span class="text-[var(--color-text-tertiary)] text-xs">(unsaved)</span>
						{/if}
						<svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				<!-- Edit/View Mode Toggle -->
				<button
					on:click={onToggleEdit}
					class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded font-medium flex items-center gap-2 h-[38px] {isEditing ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary))'}"
				>
					{#if isEditing}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
						Editing
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
						Viewing
					{/if}
				</button>

				<!-- Save Button -->
				<button
					on:click={onSave}
					disabled={!isEditing || !hasUnsavedChanges}
					class="px-4 py-2 text-sm bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[38px]"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
					</svg>
					Save
				</button>
			</div>
		{/if}

		<!-- Right: Actions -->
		<div class="flex items-center gap-3">
			<!-- Settings -->
			<button
				on:click={onSettings}
				class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors h-[38px]"
				title="Settings"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
		</div>
	</div>
</nav>
