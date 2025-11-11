<script lang="ts">
	import type { VersionScheme } from '$lib/types/version';

	let {
		currentScheme = 'semantic',
		onSchemeChange
	}: {
		currentScheme: VersionScheme;
		onSchemeChange: (scheme: VersionScheme) => void;
	} = $props();

	let selectedScheme = $state<VersionScheme>(currentScheme);

	function handleChange(scheme: VersionScheme) {
		selectedScheme = scheme;
		onSchemeChange(scheme);
	}
</script>

<div class="versioning-settings">
	<h3 class="settings-title">Version Numbering Scheme</h3>

	<div class="scheme-options">
		<label class="scheme-option">
			<input
				type="radio"
				name="versionScheme"
				value="semantic"
				checked={selectedScheme === 'semantic'}
				onchange={() => handleChange('semantic')}
			/>
			<span class="option-content">
				<span class="option-title">Semantic Versioning</span>
				<span class="option-description">MAJOR.MINOR.PATCH (e.g., 1.2.3)</span>
				<span class="option-detail">
					Ideal for tracking feature changes and major deck revisions
				</span>
			</span>
		</label>

		<label class="scheme-option">
			<input
				type="radio"
				name="versionScheme"
				value="date"
				checked={selectedScheme === 'date'}
				onchange={() => handleChange('date')}
			/>
			<span class="option-content">
				<span class="option-title">Date-Based Versioning</span>
				<span class="option-description">YY.MM.DD-rev.N (e.g., 25.01.15-rev.1)</span>
				<span class="option-detail">
					Auto-increments by date, useful for chronological tracking
				</span>
			</span>
		</label>
	</div>

	<div class="settings-note">
		<p>
			<strong>Note:</strong> Changing versioning schemes will start a new version sequence. Your
			existing version history will be preserved.
		</p>
	</div>
</div>

<style>
	.versioning-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.settings-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.scheme-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.scheme-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-primary);
		border: 2px solid var(--color-border);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.scheme-option:hover {
		border-color: var(--color-accent-blue);
		background: var(--color-bg-hover);
	}

	.scheme-option:has(input:checked) {
		border-color: var(--color-accent-blue);
		background: var(--color-bg-hover);
	}

	.scheme-option input[type='radio'] {
		margin-top: 0.25rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.option-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.option-title {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 1rem;
	}

	.option-description {
		font-size: 0.875rem;
		color: var(--color-accent-blue);
		font-family: 'Courier New', monospace;
	}

	.option-detail {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.settings-note {
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
	}

	.settings-note p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.settings-note strong {
		color: var(--color-text-primary);
	}
</style>
