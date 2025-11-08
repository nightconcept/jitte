<script lang="ts">
	import { getNextVersion, applyBump, isValidVersion } from '$lib/utils/semver';
	import type { VersionDiff } from '$lib/types/version';

	export let currentVersion: string;
	export let diff: VersionDiff | null;
	export let onCommit: (version: string, message: string) => void;
	export let onCancel: () => void;

	// Suggested version based on diff
	$: suggestedVersion = diff
		? getNextVersion(currentVersion, diff.totalChanges)
		: applyBump(currentVersion, 'patch');

	let selectedVersion = suggestedVersion;
	let customVersion = '';
	let commitMessage = '';
	let isCustom = false;
	let versionError = '';

	// Update selected version when suggestion changes
	$: if (!isCustom) {
		selectedVersion = suggestedVersion;
	}

	function selectSuggested() {
		isCustom = false;
		selectedVersion = suggestedVersion;
		versionError = '';
	}

	function selectCustom() {
		isCustom = true;
		customVersion = selectedVersion;
	}

	function handleCustomVersionInput() {
		if (isValidVersion(customVersion)) {
			selectedVersion = customVersion;
			versionError = '';
		} else {
			versionError = 'Invalid version format (must be X.Y.Z)';
		}
	}

	function handleSubmit() {
		if (!commitMessage.trim()) {
			return;
		}

		if (isCustom && !isValidVersion(customVersion)) {
			versionError = 'Invalid version format (must be X.Y.Z)';
			return;
		}

		onCommit(selectedVersion, commitMessage.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		} else if (e.key === 'Enter' && e.ctrlKey) {
			handleSubmit();
		}
	}

	// Get summary text
	$: summaryText = diff
		? `${diff.added.length} added, ${diff.removed.length} removed, ${diff.modified.length} modified (${diff.totalChanges} total changes)`
		: 'No changes detected';
</script>

<!-- Modal Backdrop -->
<div
	class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
	on:click={onCancel}
	on:keydown={handleKeydown}
	role="button"
	tabindex="-1"
>
	<!-- Modal Content -->
	<div
		class="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-2xl w-full mx-4 border border-[var(--color-border)]"
		on:click|stopPropagation
		role="dialog"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="px-6 py-4 border-b border-[var(--color-border)]">
			<h2 class="text-xl font-bold text-[var(--color-text-primary)]">Commit Changes</h2>
			<p class="text-sm text-[var(--color-text-secondary)] mt-1">{summaryText}</p>
		</div>

		<!-- Body -->
		<div class="px-6 py-4 space-y-4">
			<!-- Version Selection -->
			<div>
				<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
					Version
				</label>

				<div class="space-y-2">
					<!-- Suggested Version -->
					<button
						on:click={selectSuggested}
						class="w-full flex items-center justify-between px-4 py-3 rounded border transition-colors {!isCustom
							? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
							: 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
					>
						<div class="text-left">
							<div class="font-semibold text-[var(--color-text-primary)]">
								{suggestedVersion}
								<span class="text-sm font-normal text-[var(--color-text-secondary)]">
									(Suggested {diff?.suggestedBump || 'patch'} bump)
								</span>
							</div>
							<div class="text-xs text-[var(--color-text-tertiary)] mt-0.5">
								Based on {diff?.totalChanges || 0} changes
							</div>
						</div>
						{#if !isCustom}
							<svg class="w-5 h-5 text-[var(--color-brand-primary)]" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{/if}
					</button>

					<!-- Custom Version -->
					<button
						on:click={selectCustom}
						class="w-full flex items-center justify-between px-4 py-3 rounded border transition-colors {isCustom
							? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10'
							: 'border-[var(--color-border)] hover:border-[var(--color-brand-primary)]/50'}"
					>
						<div class="text-left flex-1">
							<div class="font-semibold text-[var(--color-text-primary)]">
								Custom Version
							</div>
							{#if isCustom}
								<input
									bind:value={customVersion}
									on:input={handleCustomVersionInput}
									on:click|stopPropagation
									type="text"
									placeholder="1.0.0"
									class="mt-2 w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
								/>
								{#if versionError}
									<div class="text-xs text-[var(--color-error)] mt-1">{versionError}</div>
								{/if}
							{/if}
						</div>
						{#if isCustom}
							<svg class="w-5 h-5 text-[var(--color-brand-primary)]" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- Commit Message -->
			<div>
				<label class="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
					Commit Message <span class="text-[var(--color-error)]">*</span>
				</label>
				<textarea
					bind:value={commitMessage}
					placeholder="Describe what changed in this version..."
					rows="4"
					class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] resize-none"
					autofocus
				></textarea>
				<div class="text-xs text-[var(--color-text-tertiary)] mt-1">
					Press Ctrl+Enter to commit
				</div>
			</div>

			<!-- Change Summary -->
			{#if diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0)}
				<div class="border-t border-[var(--color-border)] pt-4">
					<div class="text-sm font-medium text-[var(--color-text-primary)] mb-2">
						Changes Preview
					</div>
					<div class="space-y-1 max-h-32 overflow-y-auto text-sm">
						{#each diff.added as card}
							<div class="text-green-500">
								+ {card.quantityDelta}x {card.name}
							</div>
						{/each}
						{#each diff.removed as card}
							<div class="text-red-500">
								- {Math.abs(card.quantityDelta || 0)}x {card.name}
							</div>
						{/each}
						{#each diff.modified as card}
							<div class="text-yellow-500">
								~ {card.name} ({card.oldQuantity} → {card.newQuantity})
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				on:click={onCancel}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button
				on:click={handleSubmit}
				disabled={!commitMessage.trim() || (isCustom && !isValidVersion(customVersion))}
				class="px-4 py-2 rounded bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Commit as {selectedVersion}
			</button>
		</div>
	</div>
</div>
