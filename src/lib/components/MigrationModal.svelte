<script lang="ts">
	import { type Snippet } from 'svelte';
	import {
		migrateZipToFolders,
		getMigrationRecommendation,
		cleanupLegacyZipFiles,
		type MigrationProgress
	} from '$lib/storage/migration';

	let {
		isOpen = $bindable(),
		directoryHandle,
		onComplete
	}: {
		isOpen: boolean;
		directoryHandle: FileSystemDirectoryHandle | null;
		onComplete?: () => void;
	} = $props();

	let migrationState = $state<'idle' | 'checking' | 'ready' | 'migrating' | 'complete' | 'error'>(
		'idle'
	);
	let recommendation = $state<string>('');
	let progress = $state<MigrationProgress>({ total: 0, completed: 0, errors: [] });
	let errorMessage = $state<string>('');
	let keepOldFiles = $state<boolean>(false);

	// Check for migration when modal opens
	$effect(() => {
		if (isOpen && directoryHandle && migrationState === 'idle') {
			checkMigration();
		}
	});

	async function checkMigration() {
		if (!directoryHandle) return;

		migrationState = 'checking';

		try {
			const result = await getMigrationRecommendation(directoryHandle);

			if (result.shouldMigrate) {
				recommendation = result.message;
				migrationState = 'ready';
			} else {
				recommendation = result.message;
				// Auto-close if no migration needed
				setTimeout(() => {
					isOpen = false;
				}, 2000);
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to check migration status';
			migrationState = 'error';
		}
	}

	async function startMigration() {
		if (!directoryHandle) return;

		migrationState = 'migrating';
		progress = { total: 0, completed: 0, errors: [] };

		try {
			const result = await migrateZipToFolders(directoryHandle, directoryHandle, (p) => {
				progress = p;
			});

			if (result.success) {
				migrationState = 'complete';

				// Cleanup old zip files if user chose not to keep them
				if (!keepOldFiles) {
					await cleanupLegacyZipFiles(directoryHandle, true);
				}

				// Notify completion
				if (onComplete) {
					onComplete();
				}
			} else {
				errorMessage = `Migration completed with errors: ${result.failedCount} decks failed`;
				migrationState = 'error';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Migration failed';
			migrationState = 'error';
		}
	}

	function close() {
		if (migrationState !== 'migrating') {
			isOpen = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') close();
		}}
		role="button"
		tabindex="0"
	>
		<div
			class="w-full max-w-2xl rounded-lg bg-[var(--color-bg-primary)] p-6 shadow-xl border border-[var(--color-border)]"
		>
			<h2 class="mb-4 text-2xl font-bold text-[var(--color-text-primary)]">
				Storage Migration
			</h2>

			{#if migrationState === 'checking'}
				<div class="space-y-4">
					<p class="text-[var(--color-text-secondary)]">
						Checking for legacy deck files...
					</p>
					<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
						<div class="h-full w-1/3 animate-pulse bg-[var(--color-accent-blue)]"></div>
					</div>
				</div>
			{:else if migrationState === 'ready'}
				<div class="space-y-4">
					<p class="text-[var(--color-text-secondary)]">
						{recommendation}
					</p>

					<div class="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
						<h3 class="mb-2 font-semibold text-[var(--color-text-primary)]">What will happen:</h3>
						<ul class="list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
							<li>All .zip deck files will be converted to folder structures</li>
							<li>Folder structure uses branches/ organization (cleaner)</li>
							<li>Better performance and easier debugging</li>
							<li>All version history will be preserved</li>
						</ul>
					</div>

					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={keepOldFiles} class="rounded" />
						<span class="text-sm text-[var(--color-text-secondary)]">
							Keep old .zip files after migration (not recommended)
						</span>
					</label>

					<div class="flex justify-end gap-3">
						<button
							onclick={() => close()}
							class="rounded bg-[var(--color-bg-secondary)] px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
						>
							Skip
						</button>
						<button
							onclick={() => startMigration()}
							class="rounded bg-[var(--color-accent-blue)] px-4 py-2 text-white hover:opacity-90"
						>
							Start Migration
						</button>
					</div>
				</div>
			{:else if migrationState === 'migrating'}
				<div class="space-y-4">
					<p class="text-[var(--color-text-secondary)]">
						Migrating deck files... ({progress.completed} / {progress.total})
					</p>

					{#if progress.currentDeck}
						<p class="text-sm text-[var(--color-text-tertiary)]">
							Current: {progress.currentDeck}
						</p>
					{/if}

					<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
						<div
							class="h-full bg-[var(--color-accent-blue)] transition-all duration-300"
							style="width: {progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%"
						></div>
					</div>

					{#if progress.errors.length > 0}
						<div class="max-h-32 overflow-y-auto rounded border border-red-500/50 bg-red-500/10 p-2">
							<p class="mb-1 text-sm font-semibold text-red-400">Errors:</p>
							<ul class="space-y-1 text-xs text-red-300">
								{#each progress.errors as error}
									<li>{error.deckName}: {error.error}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else if migrationState === 'complete'}
				<div class="space-y-4">
					<div class="rounded bg-green-500/20 p-4 border border-green-500/50">
						<p class="font-semibold text-green-400">Migration Complete!</p>
						<p class="mt-2 text-sm text-[var(--color-text-secondary)]">
							Successfully migrated {progress.completed} deck(s) to folder-based storage.
						</p>

						{#if progress.errors.length > 0}
							<p class="mt-2 text-sm text-yellow-400">
								{progress.errors.length} deck(s) had errors during migration.
							</p>
						{/if}
					</div>

					<div class="flex justify-end">
						<button
							onclick={() => {
								isOpen = false;
								if (onComplete) onComplete();
							}}
							class="rounded bg-[var(--color-accent-blue)] px-4 py-2 text-white hover:opacity-90"
						>
							Done
						</button>
					</div>
				</div>
			{:else if migrationState === 'error'}
				<div class="space-y-4">
					<div class="rounded bg-red-500/20 p-4 border border-red-500/50">
						<p class="font-semibold text-red-400">Migration Error</p>
						<p class="mt-2 text-sm text-[var(--color-text-secondary)]">
							{errorMessage}
						</p>
					</div>

					<div class="flex justify-end gap-3">
						<button
							onclick={() => close()}
							class="rounded bg-[var(--color-bg-secondary)] px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
						>
							Close
						</button>
						<button
							onclick={() => {
								migrationState = 'ready';
								errorMessage = '';
							}}
							class="rounded bg-[var(--color-accent-blue)] px-4 py-2 text-white hover:opacity-90"
						>
							Retry
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
