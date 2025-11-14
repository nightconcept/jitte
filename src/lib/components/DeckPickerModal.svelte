<script lang="ts">
	import { onMount } from 'svelte';
	import BaseModal from './BaseModal.svelte';
	import FolderPromptModal from './FolderPromptModal.svelte';
	import type { DeckListItem } from '$lib/stores/deck-manager';
	import type { Folder, FolderStructure, BrowserItem } from '$lib/types/folder';
	import {
		loadFolderStructure,
		saveFolderStructure,
		createFolder,
		addFolder,
		renameFolder,
		deleteFolder,
		moveDeckToFolder,
		getChildFolders,
		getFolderById,
		isValidFolderName,
		folderNameExists
	} from '$lib/utils/folder-manager';
	import { extractCommanderNames } from '$lib/utils/deck-info-extractor';
	import { StorageManager } from '$lib/storage/storage-manager';

	let {
		isOpen = false,
		decks = [],
		storage = null,
		onclose,
		onload,
		ondelete
	}: {
		isOpen?: boolean;
		decks: DeckListItem[];
		storage: StorageManager | null;
		onclose?: () => void;
		onload?: (deckName: string) => void;
		ondelete?: (deckName: string) => void;
	} = $props();

	// Folder state
	let folderStructure = $state<FolderStructure>(loadFolderStructure());
	let currentFolderId = $state<string | null>(null); // null = root
	let browserItems = $state<BrowserItem[]>([]);
	let commanderCache = $state<Map<string, string[]>>(new Map());

	// UI state
	let deckToDelete = $state<string | null>(null);
	let folderToDelete = $state<Folder | null>(null);
	let folderToRename = $state<Folder | null>(null);
	let showNewFolderModal = $state(false);
	let showRenameFolderModal = $state(false);
	let isLoadingCommanders = $state(false);

	// Drag and drop state
	let draggedDeckName = $state<string | null>(null);

	// Load commander info for visible decks in the background
	async function loadCommanderInfo() {
		if (!storage || decks.length === 0) return;

		isLoadingCommanders = true;

		// Load commanders in the background, one at a time with yields to the event loop
		for (const deck of decks) {
			if (!commanderCache.has(deck.name)) {
				// Yield to the event loop between each deck to avoid blocking
				await new Promise(resolve => setTimeout(resolve, 0));

				try {
					const result = await storage.loadDeck(deck.name);
					if (result.success && result.data) {
						const commanders = await extractCommanderNames(result.data);
						commanderCache.set(deck.name, commanders);
						// Trigger reactivity update
						commanderCache = commanderCache;
					}
				} catch (error) {
					console.error(`Failed to load commanders for ${deck.name}:`, error);
					commanderCache.set(deck.name, []);
				}
			}
		}

		isLoadingCommanders = false;
	}

	// Build browser items based on current folder
	function buildBrowserItems() {
		const items: BrowserItem[] = [];

		// Add folders at current level
		const childFolders = getChildFolders(folderStructure, currentFolderId);
		for (const folder of childFolders) {
			items.push({ type: 'folder', folder });
		}

		// Add decks at current level
		for (const deck of decks) {
			const deckFolderId = folderStructure.deckFolderMap[deck.name] || null;
			if (deckFolderId === currentFolderId) {
				items.push({
					type: 'deck',
					deckName: deck.name,
					lastModified: deck.lastModified,
					size: deck.size,
					commanders: commanderCache.get(deck.name) || []
				});
			}
		}

		browserItems = items;
	}

	// Load data when modal opens
	$effect(() => {
		if (isOpen) {
			folderStructure = loadFolderStructure();
			buildBrowserItems();
			// Load commanders in the background without blocking the modal
			loadCommanderInfo().catch(err => {
				console.error('Error loading commander info:', err);
				isLoadingCommanders = false;
			});
		}
	});

	// Rebuild items when decks, folder structure, or current folder changes
	$effect(() => {
		buildBrowserItems();
	});

	function handleLoad(deckName: string) {
		onload?.(deckName);
		onclose?.();
	}

	function confirmDelete(deckName: string) {
		deckToDelete = deckName;
	}

	function handleDeleteDeck() {
		if (deckToDelete) {
			ondelete?.(deckToDelete);
			deckToDelete = null;
		}
	}

	function cancelDeleteDeck() {
		deckToDelete = null;
	}

	function handleClose() {
		onclose?.();
		deckToDelete = null;
		currentFolderId = null;
	}

	// Folder navigation
	function navigateToFolder(folderId: string | null) {
		currentFolderId = folderId;
	}

	function navigateUp() {
		if (currentFolderId === null) return;
		const currentFolder = getFolderById(folderStructure, currentFolderId);
		if (currentFolder) {
			currentFolderId = currentFolder.parentId;
		}
	}

	// Folder creation
	function handleNewFolder() {
		showNewFolderModal = true;
	}

	function handleCreateFolder(folderName: string) {
		if (!isValidFolderName(folderName)) {
			return;
		}

		if (folderNameExists(folderStructure, folderName, currentFolderId)) {
			alert('A folder with this name already exists at this level');
			return;
		}

		const newFolder = createFolder(folderName, currentFolderId);
		folderStructure = addFolder(folderStructure, newFolder);
		saveFolderStructure(folderStructure);
		showNewFolderModal = false;
	}

	// Folder rename
	function confirmRenameFolder(folder: Folder) {
		folderToRename = folder;
		showRenameFolderModal = true;
	}

	function handleRenameFolder(newName: string) {
		if (!folderToRename) return;

		if (!isValidFolderName(newName)) {
			return;
		}

		if (
			folderNameExists(folderStructure, newName, folderToRename.parentId) &&
			newName.toLowerCase() !== folderToRename.name.toLowerCase()
		) {
			alert('A folder with this name already exists at this level');
			return;
		}

		folderStructure = renameFolder(folderStructure, folderToRename.id, newName);
		saveFolderStructure(folderStructure);
		folderToRename = null;
		showRenameFolderModal = false;
	}

	// Folder deletion
	function confirmDeleteFolder(folder: Folder) {
		folderToDelete = folder;
	}

	function handleDeleteFolder() {
		if (!folderToDelete) return;

		folderStructure = deleteFolder(folderStructure, folderToDelete.id);
		saveFolderStructure(folderStructure);
		folderToDelete = null;
	}

	function cancelDeleteFolder() {
		folderToDelete = null;
	}

	// Drag and drop
	function handleDragStart(deckName: string) {
		draggedDeckName = deckName;
	}

	function handleDragEnd() {
		draggedDeckName = null;
	}

	function handleDrop(targetFolderId: string | null) {
		if (!draggedDeckName) return;

		folderStructure = moveDeckToFolder(folderStructure, draggedDeckName, targetFolderId);
		saveFolderStructure(folderStructure);
		draggedDeckName = null;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	// Breadcrumb path
	let breadcrumbs = $derived.by(() => {
		const path: { id: string | null; name: string }[] = [{ id: null, name: 'All Decks' }];
		let currentId = currentFolderId;

		const buildPath: { id: string; name: string }[] = [];
		while (currentId) {
			const folder = getFolderById(folderStructure, currentId);
			if (!folder) break;
			buildPath.unshift({ id: folder.id, name: folder.name });
			currentId = folder.parentId;
		}

		return [...path, ...buildPath];
	});

	function formatDate(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) {
			return 'Just now';
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
		} else {
			const diffDays = Math.floor(diffHours / 24);
			if (diffDays < 7) {
				return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
			} else {
				return date.toLocaleDateString();
			}
		}
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		} else if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		} else {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
	}
</script>

<BaseModal
	{isOpen}
	onClose={handleClose}
	title="Load Deck"
	subtitle="{decks.length} deck{decks.length === 1 ? '' : 's'} available"
	size="2xl"
	height="max-h-[80vh]"
	contentClass="flex flex-col"
>
	{#snippet children()}
		<!-- Breadcrumbs & Actions -->
		<div class="px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
			<!-- Breadcrumbs -->
			<div class="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] min-w-0">
				{#each breadcrumbs as crumb, index}
					{#if index > 0}
						<span>/</span>
					{/if}
					<button
						type="button"
						class="hover:text-[var(--color-text-primary)] transition-colors truncate"
						class:font-medium={index === breadcrumbs.length - 1}
						class:text-[var(--color-text-primary)]={index === breadcrumbs.length - 1}
						onclick={() => navigateToFolder(crumb.id)}
					>
						{crumb.name}
					</button>
				{/each}
			</div>

			<!-- New Folder Button -->
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-blue)] hover:bg-[var(--color-accent-blue)]/90 text-white whitespace-nowrap"
				onclick={handleNewFolder}
			>
				+ New Folder
			</button>
		</div>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto" ondragover={handleDragOver} ondrop={() => handleDrop(currentFolderId)} role="region" aria-label="Deck browser">
			{#if browserItems.length === 0 && decks.length === 0}
				<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
					<p>No decks found. Create a new deck to get started!</p>
				</div>
			{:else if browserItems.length === 0}
				<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
					<p>This folder is empty. Drag decks here or create a subfolder.</p>
				</div>
			{:else}
				<div class="divide-y divide-[var(--color-border)]">
					{#each browserItems as item}
						{#if item.type === 'folder'}
							<!-- Folder Item -->
							<div
								class="px-6 py-4 hover:bg-[var(--color-surface-hover)] transition-colors group"
								ondragover={handleDragOver}
								ondrop={() => handleDrop(item.folder.id)}
							>
								<div class="flex items-center justify-between gap-4">
									<button
										type="button"
										class="flex items-center gap-3 flex-1 text-left min-w-0"
										ondblclick={() => navigateToFolder(item.folder.id)}
									>
										<span class="text-2xl">📁</span>
										<div class="flex-1 min-w-0">
											<div class="font-medium text-[var(--color-text-primary)] truncate">
												{item.folder.name}
											</div>
										</div>
									</button>

									<div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											class="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] rounded border border-[var(--color-border)]"
											onclick={() => confirmRenameFolder(item.folder)}
										>
											Rename
										</button>
										<button
											type="button"
											class="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded border border-red-500/50 hover:border-red-500"
											onclick={() => confirmDeleteFolder(item.folder)}
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						{:else}
							<!-- Deck Item -->
							<div
								class="px-6 py-4 hover:bg-[var(--color-surface-hover)] transition-colors cursor-move"
								draggable="true"
								ondragstart={() => handleDragStart(item.deckName)}
								ondragend={handleDragEnd}
							>
								<div class="flex items-center justify-between gap-4">
									<button
										type="button"
										class="flex-1 text-left min-w-0"
										onclick={() => handleLoad(item.deckName)}
									>
										<div class="font-medium text-[var(--color-text-primary)] truncate">
											{item.deckName}
										</div>
										{#if item.commanders.length > 0}
											<div class="text-sm text-[var(--color-accent-blue)] mt-0.5 truncate">
												{item.commanders.join(' / ')}
											</div>
										{/if}
										<div class="text-sm text-[var(--color-text-secondary)] mt-1">
											Last modified: {formatDate(item.lastModified)} • {formatSize(item.size)}
										</div>
									</button>

									<button
										type="button"
										class="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded border border-red-500/50 hover:border-red-500"
										onclick={() => confirmDelete(item.deckName)}
									>
										Delete
									</button>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end">
			<button
				onclick={handleClose}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Close
			</button>
		</div>
	{/snippet}
</BaseModal>

<!-- Delete Deck Confirmation Modal -->
<BaseModal isOpen={deckToDelete !== null} onClose={cancelDeleteDeck} title="Delete Deck?" size="md">
	{#snippet children()}
		<div class="px-6 py-4">
			<p class="text-sm text-[var(--color-text-secondary)]">
				Are you sure you want to delete "<span class="font-medium">{deckToDelete}</span>"? This
				action cannot be undone.
			</p>
		</div>

		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				type="button"
				onclick={cancelDeleteDeck}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button type="button" onclick={handleDeleteDeck} class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white">
				Delete
			</button>
		</div>
	{/snippet}
</BaseModal>

<!-- Delete Folder Confirmation Modal -->
<BaseModal isOpen={folderToDelete !== null} onClose={cancelDeleteFolder} title="Delete Folder?" size="md">
	{#snippet children()}
		<div class="px-6 py-4">
			<p class="text-sm text-[var(--color-text-secondary)]">
				Are you sure you want to delete "<span class="font-medium">{folderToDelete?.name}</span>"?
				All subfolders will be deleted and decks inside will be moved to the root level.
			</p>
		</div>

		<div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
			<button
				type="button"
				onclick={cancelDeleteFolder}
				class="px-4 py-2 rounded bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
			>
				Cancel
			</button>
			<button type="button" onclick={handleDeleteFolder} class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white">
				Delete
			</button>
		</div>
	{/snippet}
</BaseModal>

<!-- New Folder Modal -->
<FolderPromptModal
	bind:isOpen={showNewFolderModal}
	title="New Folder"
	placeholder="Folder name"
	onConfirm={handleCreateFolder}
/>

<!-- Rename Folder Modal -->
<FolderPromptModal
	bind:isOpen={showRenameFolderModal}
	title="Rename Folder"
	initialValue={folderToRename?.name || ''}
	placeholder="Folder name"
	onConfirm={handleRenameFolder}
	onCancel={() => {
		showRenameFolderModal = false;
		folderToRename = null;
	}}
/>
