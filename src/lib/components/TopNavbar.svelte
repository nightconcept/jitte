<script lang="ts">
	/**
	 * Top navigation bar with Jitte logo and main actions
	 */
	import ThemeToggle from './ThemeToggle.svelte';

	export let isEditing = false;
	export let hasUnsavedChanges = false;
	export let currentBranch = 'main';
	export let currentVersion = '1.0.0';
	export let onToggleEdit: (() => void) | undefined = undefined;
	export let onSave: (() => void) | undefined = undefined;
</script>

<nav class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3 sticky top-0 z-50">
	<div class="flex items-center justify-between">
		<!-- Left: Logo -->
		<div class="flex items-center gap-2">
			<!-- Jitte Logo/Icon - Japanese police weapon -->
			<div class="w-8 h-8 rounded flex items-center justify-center font-bold text-white" style="background: linear-gradient(to bottom right, var(--color-brand-primary), var(--color-accent-purple));">
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

		<!-- Center: Branch, Version, and Mode Controls -->
		<div class="flex items-center gap-3">
			<!-- Branch Selector -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-[var(--color-text-tertiary)]">Branch:</span>
				<button class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-brand-primary)] font-medium flex items-center gap-2">
					{currentBranch}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</div>

			<!-- Version Selector -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-[var(--color-text-tertiary)]">Version:</span>
				<button class="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-medium flex items-center gap-2">
					{currentVersion}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</div>

			<!-- Edit/View Mode Toggle -->
			<button
				on:click={onToggleEdit}
				class="px-4 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded font-medium flex items-center gap-2 {isEditing ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-text-primary)}'}"
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
				class="px-4 py-1.5 text-sm bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
				</svg>
				Save
			</button>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-3">
			<!-- Theme Toggle -->
			<ThemeToggle />

			<!-- Settings -->
			<button
				class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
				title="Settings"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>

			<!-- User Menu -->
			<button
				class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
				title="Account"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			</button>
		</div>
	</div>
</nav>
