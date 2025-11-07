<script lang="ts">
	/**
	 * Top navigation bar with Jitte logo and main actions
	 */
</script>

<nav class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3 sticky top-0 z-50">
	<div class="flex items-center justify-between">
		<!-- Left: Logo and Navigation -->
		<div class="flex items-center gap-6">
			<div class="flex items-center gap-2">
				<!-- Jitte Logo/Icon -->
				<div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded flex items-center justify-center font-bold text-white">
					J
				</div>
				<span class="text-lg font-bold text-[var(--color-text-primary)]">Jitte</span>
			</div>

			<!-- Navigation Tabs -->
			<div class="flex items-center gap-1">
				<button class="px-4 py-2 text-sm font-medium text-[var(--color-brand-primary)] border-b-2 border-[var(--color-brand-primary)]">
					Deck Builder
				</button>
				<button class="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Library
				</button>
				<button class="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
					Collection
				</button>
			</div>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-3">
			<!-- Search -->
			<button
				class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors"
				title="Search"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>

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
