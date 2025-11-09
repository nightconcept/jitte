<script lang="ts">
	/**
	 * Top navigation bar with Jitte logo and main actions
	 */

	let {
		isEditing = false,
		hasUnsavedChanges = false,
		isNewDeck = false,
		currentBranch = 'main',
		currentVersion = '1.0.0',
		availableVersions = [],
		availableBranches = ['main'],
		hasDeck = false,
		onToggleEdit = undefined,
		onSave = undefined,
		onNewDeck = undefined,
		onLoadDeck = undefined,
		onSettings = undefined,
		onNewBranch = undefined,
		onExport = undefined,
		onImport = undefined,
		onCompare = undefined,
		onSwitchVersion = undefined,
		onSwitchBranch = undefined,
		onDeleteBranch = undefined
	}: {
		isEditing?: boolean;
		hasUnsavedChanges?: boolean;
		isNewDeck?: boolean;
		currentBranch?: string;
		currentVersion?: string;
		availableVersions?: string[];
		availableBranches?: string[];
		hasDeck?: boolean;
		onToggleEdit?: (() => void) | undefined;
		onSave?: (() => void) | undefined;
		onNewDeck?: (() => void) | undefined;
		onLoadDeck?: (() => void) | undefined;
		onSettings?: (() => void) | undefined;
		onNewBranch?: (() => void) | undefined;
		onExport?: ((platform: 'plaintext' | 'moxfield' | 'archidekt') => void) | undefined;
		onImport?: (() => void) | undefined;
		onCompare?: (() => void) | undefined;
		onSwitchVersion?: ((version: string) => void) | undefined;
		onSwitchBranch?: ((branch: string) => void) | undefined;
		onDeleteBranch?: ((branch: string) => void) | undefined;
	} = $props();

	// Save button is enabled if:
	// - Deck is in edit mode AND
	// - Either has unsaved changes OR is a new deck that hasn't been saved yet
	let canSave = $derived(isEditing && (hasUnsavedChanges || isNewDeck));

	// Dropdown state
	let versionDropdownOpen = $state(false);
	let branchDropdownOpen = $state(false);
	let exportDropdownOpen = $state(false);

	// Dropdown refs
	let exportDropdownRef: HTMLDivElement | undefined = $state();
	let versionDropdownRef: HTMLDivElement | undefined = $state();
	let branchDropdownRef: HTMLDivElement | undefined = $state();

	// Click outside handler to close dropdowns
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;

			if (exportDropdownOpen && exportDropdownRef && !exportDropdownRef.contains(target)) {
				exportDropdownOpen = false;
			}

			if (versionDropdownOpen && versionDropdownRef && !versionDropdownRef.contains(target)) {
				versionDropdownOpen = false;
			}

			if (branchDropdownOpen && branchDropdownRef && !branchDropdownRef.contains(target)) {
				branchDropdownOpen = false;
			}
		}

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});
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
				onclick={onNewDeck}
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
				onclick={onLoadDeck}
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

				<!-- Export Deck Dropdown -->
				<div class="relative" bind:this={exportDropdownRef}>
					<button
						onclick={() => exportDropdownOpen = !exportDropdownOpen}
						class="px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2 h-[38px]"
						title="Export Deck"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
						Export
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Export Dropdown -->
					{#if exportDropdownOpen}
						<div class="absolute top-full mt-1 left-0 min-w-[180px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50">
							<button
								onclick={() => {
									if (onExport) onExport('archidekt');
									exportDropdownOpen = false;
								}}
								class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
							>
								<!-- Archidekt Logo -->
								<svg class="w-4 h-4" viewBox="0 0 950 950" xmlns="http://www.w3.org/2000/svg">
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="currentColor" transform="matrix(-4.8999924659729, 0.008858803659677505, -0.008858803659677505, -4.8999924659729, 1846.5793449325784, 3187.4970451598238)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="#333333" transform="matrix(-4.182153701782227, 0.007560909725725653, -0.007560909725725653, -4.182153701782227, 1677.7490226669538, 2814.728490472323)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="currentColor" transform="matrix(-4.8999924659729, 0.008858803659677505, -0.008858803659677505, -4.8999924659729, 1635.6136466903913, 2824.5324455504488)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="#FF9C00" transform="matrix(-4.182153701782227, 0.007560910191386938, -0.007560910191386938, -4.182153701782227, 1466.783203125, 2451.7641601562505)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="currentColor" transform="matrix(-4.8999924659729, 0.008858803659677505, -0.008858803659677505, -4.8999924659729, 1427.6663810653913, 3188.1803947691988)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="#CBCBCB" transform="matrix(-4.182153701782227, 0.007560909725725653, -0.007560909725725653, -4.182153701782227, 1258.8360587997663, 2815.412572503573)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="currentColor" transform="matrix(-4.8999924659729, 0.008858803659677505, -0.008858803659677505, -4.8999924659729, 1634.0981437607038, 3067.1901603941988)"/>
									<path d="M277,546l-43,25l-43-25v-50l43-25l43,25V546z" fill="#333333" transform="matrix(-4.182153701782227, 0.007560909725725653, -0.007560909725725653, -4.182153701782227, 1465.2679435653918, 2694.4216057066988)"/>
								</svg>
								Archidekt
							</button>
							<button
								onclick={() => {
									if (onExport) onExport('moxfield');
									exportDropdownOpen = false;
								}}
								class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
							>
								<!-- Moxfield Logo -->
								<svg class="w-4 h-4" viewBox="0 0 7.9375 7.9375" xmlns="http://www.w3.org/2000/svg">
									<path d="m6.985 3.0333s-0.25299-0.46703-0.21407-0.79785c-0.040958 0.013653-0.072337 0.036883-0.10758 0.062971-0.014975 0.011097-0.030665 0.022712-0.048101 0.034327h-0.03892s0.019473-0.17514 0.1946-0.31136h0.019473l0.019447-0.077838-0.35028-0.23352c-0.36973-0.56433-1.0119-0.99245-1.693-1.1092-0.019447 0-0.058367 0-0.077841-0.01946-0.029183 0-0.053499-0.004866-0.07784-0.009729-0.024315-0.004866-0.04863-0.009729-0.07784-0.009729 0.07784 0.01946 0.13623 0.038919 0.21407 0.077839 0.27244 0.097299 0.50594 0.25298 0.72001 0.44757 0.025268 0.025262 0.052573 0.050525 0.080592 0.076454 0.058341 0.053962 0.1198 0.1108 0.17238 0.17652-0.077841-0.058377-0.13621-0.097297-0.21405-0.13622-0.097314-0.038918-0.21407-0.077838-0.33084-0.11676 0.058394 0.05838 0.13623 0.17514 0.17515 0.27244-0.36973-0.42811-0.91461-0.73947-1.4789-0.83677-0.07784-0.038919-0.17513-0.058379-0.25297-0.058379 0.00971 0 0.024315 0.004866 0.03892 0.009729 0.014579 0.004866 0.029184 0.009731 0.03892 0.009731 0.019447 0.009729 0.03892 0.014594 0.058367 0.01946 0.019447 0.004866 0.03892 0.009731 0.058367 0.01946 0.42812 0.15568 0.79785 0.42811 1.0508 0.77839-0.17515-0.17514-0.35028-0.2919-0.56433-0.36974h-0.097314c-1.8487 0-3.3471 1.4984-3.3471 3.3471 0 0.46704 0.097287 0.89516 0.27242 1.3038 0-0.036751-0.00431-0.073501-0.00892-0.11232-0.00511-0.043365-0.01053-0.089297-0.01053-0.14068 0-0.17513 0.019447-0.35026 0.03892-0.50594 0.17513 1.1676 1.0119 2.199 2.2379 2.5298 0.40865 0.11676 0.8173 0.13621 1.2259 0.07784 0.15568-0.019473 0.29191-0.03892 0.4476-0.097314 0.019447-0.00971 0.038894-0.014578 0.058367-0.019447 0.019447-0.00487 0.03892-0.00974 0.058367-0.019473-0.27242 0.019473-0.54486-0.019447-0.77838-0.11673-0.00974 0-0.024315-0.00487-0.03892-0.00974s-0.029183-0.00974-0.03892-0.00974h0.38921c0.29189-0.038913 0.58378-0.1362 0.83677-0.27243 0.23349-0.13621 0.44757-0.31136 0.6227-0.54486 0.00974-0.00974 0.014605-0.019473 0.019473-0.02921 0.00487-0.00971 0.00971-0.019447 0.019447-0.029184 0.019473-0.03892 0.03892-0.058367 0.07784-0.097287-0.11676 0.097287-0.25297 0.17513-0.3892 0.25297-0.019447 0.019473-0.058367 0.03892-0.07784 0.03892 0.15568-0.13621 0.31136-0.31136 0.40868-0.50596 0.1946-0.33081 0.31134-0.70054 0.31134-1.1092v-0.097314 2.65e-5c-0.058367 0.17513-0.11676 0.35026-0.21405 0.50594l0.00273-0.00953c0.04508-0.15668 0.24233-0.84224-0.11949-1.5278v0.019447l2.64e-5 0.0055c0.00204 0.00643 0.00402 0.012859 0.00601 0.019315 0.00288 0.00355 0.00714 0.00781 0.013414 0.014102h2.64e-5c0.07784 0.27244 0.11676 0.56433 0.07784 0.85622-0.11676 0.99246-0.93409 1.7709-1.9071 1.8487-0.17201 0.012726-0.34039 0.0046038-0.50271-0.022066-1.0172-0.14803-1.7984-1.0238-1.7984-2.082 0-0.1188 0.00984-0.23529 0.02876-0.34869 0.12578-0.81576 0.73504-1.4846 1.5134-1.6921 0.17513-0.05838 0.36973-0.07784 0.54488-0.07784 0.21405 0 0.40865 0.03892 0.60325 0.0973l0.058367-0.2919 0.13679 0.35906c0.15513 0.062082 0.30112 0.1421 0.43548 0.23749-0.038576-0.070049-0.093107-0.15816-0.16362-0.24628 0 0 0.27892 0.20143 0.5049 0.54899 0.032676 0.036002 0.064135 0.073152 0.094297 0.11136-0.036116 0.020479-0.076888 0.048075-0.10007 0.080698 0.11837 0.034025 0.28517 0.19304 0.38695 0.40442 0.0036 0.00847 0.00712 0.016986 0.010583 0.025532 0.0703 0.012621 0.30218 0.063659 0.46551 0.21066h0.019473c0.077842-0.21407 0.29189-0.33083 0.29189-0.33083s0.019473-0.29189 0.15568-0.44757zm-0.89516-0.66163c-0.1946-0.13622-0.52541-0.1946-0.52541-0.1946l0.11676-0.11676 0.019473-0.097298c0.15565 0.058378 0.25297 0.17514 0.31134 0.25298 0.019473 0.01946 0.03892 0.03892 0.03892 0.058378 0.03892 0.05838 0.03892 0.097301 0.03892 0.097301z" clip-rule="evenodd" fill="currentColor" fill-rule="evenodd"/>
									<path d="m5.5772 4.3931c0 0.74724-0.60576 1.353-1.353 1.353-0.74726 0-1.353-0.60576-1.353-1.353 0-0.74724 0.60576-1.353 1.353-1.353 0.74724 0 1.353 0.60576 1.353 1.353z" fill="#d44071"/>
									<path d="m4.2607 3.3836 0.88474 0.5108v1.0216l-0.88474 0.51083-0.88477-0.51083v-1.0216z" fill="#f25e8f"/>
								</svg>
								Moxfield
							</button>
							<button
								onclick={() => {
									if (onExport) onExport('plaintext');
									exportDropdownOpen = false;
								}}
								class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								Plaintext
							</button>
						</div>
					{/if}
				</div>

				

				<!-- Compare Versions -->
				<button
					onclick={onCompare}
					class="px-3 py-2 text-sm rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-medium flex items-center gap-2 h-[38px]"
					title="Compare Versions"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
					Compare
				</button>
			{/if}
		</div>

		<!-- Center: Edit/View Mode Toggle -->
		{#if hasDeck}
		<div class="flex items-center">
		<!-- Edit/View Mode Toggle -->
			<button
				onclick={onToggleEdit}
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
		</div>
	{/if}

	<!-- Right: Branch, Version, Save, and Actions -->
	{#if hasDeck}
		<div class="flex items-center gap-3">
			<!-- Branch Selector -->
				<div class="flex items-center gap-2 relative" bind:this={branchDropdownRef}>
					<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Branch:</span>
					<button
						onclick={() => branchDropdownOpen = !branchDropdownOpen}
						class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-brand-primary)] font-medium flex items-center gap-2 h-[38px]"
					>
						{currentBranch}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Branch Dropdown -->
					{#if branchDropdownOpen && availableBranches.length > 0}
						<div class="absolute top-full mt-1 left-0 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50 max-h-64 overflow-y-auto">
							{#each availableBranches as branch}
								<div class="flex items-center hover:bg-[var(--color-surface-hover)]">
									<button
										onclick={() => {
											if (onSwitchBranch) onSwitchBranch(branch);
											branchDropdownOpen = false;
										}}
										class="flex-1 px-4 py-2 text-left text-sm {branch === currentBranch ? 'text-[var(--color-brand-primary)] font-semibold' : 'text-[var(--color-text-primary)]'} flex items-center justify-between"
									>
										<span>{branch}</span>
										{#if branch === currentBranch}
											<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										{/if}
									</button>
									{#if branch !== 'main'}
										<button
											onclick={() => {
												if (onDeleteBranch) {
													const confirmed = confirm(`Delete branch "${branch}"? This cannot be undone.`);
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
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
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
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</button>
				</div>

				<!-- Version Selector -->
				<div class="flex items-center gap-2 relative" bind:this={versionDropdownRef}>
					<span class="text-sm text-[var(--color-text-secondary)] font-semibold">Version:</span>
					<button
						onclick={() => versionDropdownOpen = !versionDropdownOpen}
						class="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-medium flex items-center gap-2 min-w-[140px] h-[38px]"
					>
						<span>{currentVersion}</span>
						{#if hasUnsavedChanges}
							<span class="text-[var(--color-text-tertiary)] text-xs">(unsaved)</span>
						{/if}
						<svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Version Dropdown -->
					{#if versionDropdownOpen && availableVersions.length > 0}
						<div class="absolute top-full mt-1 right-0 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50 max-h-64 overflow-y-auto">
							{#each availableVersions.slice().reverse() as version}
								<button
									onclick={() => {
										if (onSwitchVersion) onSwitchVersion(version);
										versionDropdownOpen = false;
									}}
									class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] {version === currentVersion ? 'text-[var(--color-brand-primary)] font-semibold' : 'text-[var(--color-text-primary)]'} flex items-center justify-between"
								>
									<span>{version}</span>
									{#if version === currentVersion}
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
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
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
					</svg>
					Save
				</button>

				<!-- Settings -->
				<button
					onclick={onSettings}
					class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors h-[38px]"
					title="Settings"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
			</div>
		{:else}
			<!-- Settings (when no deck loaded) -->
			<div class="flex items-center gap-3">
				<button
					onclick={onSettings}
					class="px-3 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-colors h-[38px]"
					title="Settings"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
</nav>
