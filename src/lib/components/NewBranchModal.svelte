<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let currentBranch = 'main';
	export let availableVersions: string[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		create: { branchName: string; mode: 'current' | 'version'; fromVersion?: string };
	}>();

	let branchName = '';
	let mode: 'current' | 'version' = 'current';
	let selectedVersion = availableVersions[0] || '1.0.0';

	// Update selected version when availableVersions changes
	$: if (availableVersions.length > 0 && !availableVersions.includes(selectedVersion)) {
		selectedVersion = availableVersions[0];
	}

	function sanitizeBranchName(name: string): string {
		return name
			.toLowerCase()
			.replace(/\s+/g, '-') // Convert spaces to dashes
			.replace(/[^a-z0-9\/-]/g, ''); // Only allow alphanumeric and /
	}

	function handleCreate() {
		if (!branchName.trim()) {
			return;
		}

		const sanitizedName = sanitizeBranchName(branchName.trim());

		if (!sanitizedName) {
			return;
		}

		dispatch('create', {
			branchName: sanitizedName,
			mode,
			fromVersion: mode === 'version' ? selectedVersion : undefined
		});

		// Reset form
		branchName = '';
		mode = 'current';
	}

	function handleClose() {
		dispatch('close');
		// Reset form
		branchName = '';
		mode = 'current';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			handleCreate();
		}
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
		on:keydown={handleKeydown}
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
				<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Create New Branch</h2>
				<p class="text-sm text-[var(--color-text-secondary)] mt-1">
					Branch from version on <span class="text-[var(--color-brand-primary)] font-medium">{currentBranch}</span>
				</p>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 space-y-4">
				<!-- Branch Name -->
				<div>
					<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Branch Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={branchName}
						placeholder="experimental or feature/new-cards"
						class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
					/>
					{#if branchName.trim()}
						<div class="text-xs text-[var(--color-text-secondary)] mt-1">
							Will be created as: <span class="font-mono text-[var(--color-brand-primary)]">{sanitizeBranchName(branchName.trim())}</span>
						</div>
					{/if}
				</div>

				<!-- Branch Mode -->
				<div>
					<div class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Branch Mode
					</div>
					<div class="space-y-2">
						<!-- Bring current changes -->
						<label
							class="flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors {mode === 'current'
								? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
								: 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
						>
							<input
								type="radio"
								bind:group={mode}
								value="current"
								class="mt-0.5"
							/>
							<div>
								<div class="font-medium text-[var(--color-text-primary)]">
									Bring current changes
								</div>
								<div class="text-xs text-[var(--color-text-secondary)] mt-0.5">
									Start the new branch with your current working state (includes unsaved changes)
								</div>
							</div>
						</label>

						<!-- Branch from version -->
						<label
							class="flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors {mode === 'version'
								? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
								: 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
						>
							<input
								type="radio"
								bind:group={mode}
								value="version"
								class="mt-0.5"
							/>
							<div class="flex-1">
								<div class="font-medium text-[var(--color-text-primary)]">
									Branch from version
								</div>
								<div class="text-xs text-[var(--color-text-secondary)] mt-0.5">
									Start from a specific saved version
								</div>
								{#if mode === 'version'}
									<select
										bind:value={selectedVersion}
										on:click|stopPropagation
										class="mt-2 w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
									>
										{#each availableVersions as version}
											<option value={version}>{version}</option>
										{/each}
									</select>
								{/if}
							</div>
						</label>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
				<button
					on:click={handleClose}
					class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
				>
					Cancel
				</button>
				<button
					on:click={handleCreate}
					disabled={!branchName.trim()}
					class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Create Branch
				</button>
			</div>
		</div>
	</div>
{/if}
