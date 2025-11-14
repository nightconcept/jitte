<script lang="ts">
	import BaseModal from './BaseModal.svelte';

	let { isOpen = false, onClose }: { isOpen?: boolean; onClose: () => void } = $props();
</script>

<BaseModal {isOpen} {onClose} title="Licensing Information" size="3xl" height="max-h-[85vh]">
	{#snippet children()}
		<!-- Scrollable Body -->
		<div class="flex-1 overflow-y-auto">
			<div class="px-6 py-4 space-y-6 text-sm">
				<!-- Introduction -->
				<div class="text-[var(--color-text-secondary)]">
					<p>
						This distribution contains code and themes from the following projects. Full license
						texts are available at their respective links.
					</p>
				</div>

				<!-- Jitte -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">Jitte</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://github.com/nightconcept/jitte"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://github.com/nightconcept/jitte
							</a>
						</div>
						<div><span class="font-medium">License:</span> MIT</div>
						<div><span class="font-medium">Copyright:</span> (c) 2024-2025 nightconcept</div>
					</div>
				</div>

				<!-- Tinted Theming Schemes -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">
						Tinted Theming Base16/Base24 Schemes
					</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://github.com/tinted-theming/schemes"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://github.com/tinted-theming/schemes
							</a>
						</div>
						<div><span class="font-medium">License:</span> MIT</div>
						<div>
							<span class="font-medium">Copyright:</span> (c) Tinted Theming contributors
						</div>
						<div class="text-xs mt-2">
							This project includes color schemes from the Tinted Theming project, including:
							<ul class="list-disc list-inside ml-2 mt-1">
								<li>Equilibrium Gray (base16)</li>
								<li>Tokyo Night (base16)</li>
								<li>Kanagawa (base16)</li>
								<li>Rosé Pine (base16)</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Scryfall -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">Scryfall API</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://scryfall.com/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://scryfall.com/
							</a>
						</div>
						<div class="text-xs mt-2">
							Card data and images provided by Scryfall. Scryfall is not affiliated with or
							endorsed by Wizards of the Coast.
						</div>
					</div>
				</div>

				<!-- Mana Font -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">Mana Font</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://mana.andrewgioia.com/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://mana.andrewgioia.com/
							</a>
						</div>
						<div><span class="font-medium">License:</span> SIL OFL 1.1 / MIT</div>
						<div><span class="font-medium">Copyright:</span> (c) Andrew Gioia</div>
					</div>
				</div>

				<!-- Keyrune -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">Keyrune</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://keyrune.andrewgioia.com/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://keyrune.andrewgioia.com/
							</a>
						</div>
						<div><span class="font-medium">License:</span> SIL OFL 1.1 / MIT</div>
						<div><span class="font-medium">Copyright:</span> (c) Andrew Gioia</div>
					</div>
				</div>

				<!-- SvelteKit -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">SvelteKit</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://kit.svelte.dev/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://kit.svelte.dev/
							</a>
						</div>
						<div><span class="font-medium">License:</span> MIT</div>
						<div><span class="font-medium">Copyright:</span> (c) Svelte contributors</div>
					</div>
				</div>

				<!-- JSZip -->
				<div class="border border-[var(--color-border)] rounded-lg p-4">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">JSZip</h3>
					<div class="space-y-1 text-[var(--color-text-secondary)]">
						<div>
							<span class="font-medium">Website:</span>
							<a
								href="https://stuk.github.io/jszip/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-[var(--color-accent-blue)] hover:underline ml-1"
							>
								https://stuk.github.io/jszip/
							</a>
						</div>
						<div><span class="font-medium">License:</span> MIT or GPLv3</div>
						<div><span class="font-medium">Copyright:</span> (c) Stuart Knightley</div>
					</div>
				</div>

				<!-- Magic: The Gathering -->
				<div class="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-bg-tertiary)]">
					<h3 class="font-bold text-[var(--color-text-primary)] mb-2">
						Magic: The Gathering Disclaimer
					</h3>
					<div class="space-y-2 text-xs text-[var(--color-text-secondary)]">
						<p>
							Wizards of the Coast, Magic: The Gathering, and their logos are trademarks of
							Wizards of the Coast LLC in the United States and other countries. © Wizards of the
							Coast LLC.
						</p>
						<p>
							This application is not affiliated with, endorsed, sponsored, or specifically
							approved by Wizards of the Coast LLC. This application may use the trademarks and
							other intellectual property of Wizards of the Coast LLC, which is permitted under
							Wizards' Fan Content Policy.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer (outside scrollable area) -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
			<button
				onclick={onClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>
