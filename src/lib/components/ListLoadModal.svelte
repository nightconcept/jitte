<script lang="ts">
	import { onMount, untrack } from 'svelte';
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
		folderNameExists,
		reorderDecks,
		getOrderedDecks
	} from '$lib/utils/folder-manager';
	import { extractDeckInfo, type DeckInfo } from '$lib/utils/deck-info-extractor';
	import { DeckFormat, FORMAT_METADATA } from '$lib/formats/format-registry';
	import { StorageManager } from '$lib/storage/storage-manager';
	import { Z_INDEX } from '$lib/constants/z-index';

	let {
		isOpen = false,
		decks = [],
		storage = null,
		onclose,
		onload,
		ondelete,
		onrename
	}: {
		isOpen?: boolean;
		decks: DeckListItem[];
		storage: StorageManager | null;
		onclose?: () => void;
		onload?: (deckName: string) => void;
		ondelete?: (deckName: string) => void;
		onrename?: (oldName: string, newName: string) => void;
	} = $props();

	// Folder state
	let folderStructure = $state<FolderStructure>(loadFolderStructure());
	let currentFolderId = $state<string | null>(null); // null = root
	let browserItems = $state<BrowserItem[]>([]);
	let deckInfoCache = $state<Map<string, DeckInfo>>(new Map());

	// UI state
	let deckToDelete = $state<string | null>(null);
	let deckToRename = $state<string | null>(null);
	let folderToDelete = $state<Folder | null>(null);
	let folderToRename = $state<Folder | null>(null);
	let showNewFolderModal = $state(false);
	let showRenameFolderModal = $state(false);
	let showRenameDeckModal = $state(false);
	let isLoadingCommanders = $state(false);
	const COMMANDER_BATCH_DELAY = 32;
	let commanderLoadQueue: string[] = [];
	let commanderLoadHandle: ReturnType<typeof setTimeout> | null = null;
	let openMenuDeckName = $state<string | null>(null);
	let openMenuFolderId = $state<string | null>(null);

	// Drag and drop state
	let draggedDeckName = $state<string | null>(null);
	let dropTargetDeckName = $state<string | null>(null); // Which deck row is being hovered
	let dropPosition = $state<'above' | 'below' | null>(null); // Insert above or below target

	function stopCommanderLoading() {
		if (commanderLoadHandle !== null) {
			clearTimeout(commanderLoadHandle);
			commanderLoadHandle = null;
		}
		commanderLoadQueue = [];
		isLoadingCommanders = false;
	}

	async function loadDeckInfoForDeck(deckName: string) {
		if (!storage) return;

		console.log('[ListLoadModal] loadDeckInfoForDeck() called for:', deckName);
		try {
			const result = await storage.loadDeck(deckName);
			if (result.success && result.data) {
				console.log('[ListLoadModal] Extracting deck info for:', deckName);
				const deckInfo = await extractDeckInfo(result.data);
				console.log('[ListLoadModal] Deck info extracted:', deckInfo);
				// Create a new Map to trigger reactivity
				deckInfoCache = new Map(deckInfoCache.set(deckName, deckInfo));
			} else {
				console.warn(`[ListLoadModal] Failed to load deck "${deckName}":`, result.error);
				// Don't cache failed loads - let it keep showing "Loading..." until it succeeds
				// This prevents showing incorrect format/commander info
			}
		} catch (error) {
			console.error(`[ListLoadModal] Error loading deck info for ${deckName}:`, error);
			// Don't cache errors - let it retry on next attempt
		}
	}

	function processCommanderQueue() {
		if (!isOpen || commanderLoadQueue.length === 0 || !storage) {
			stopCommanderLoading();
			return;
		}

		const nextDeck = commanderLoadQueue.shift();
		if (!nextDeck) {
			stopCommanderLoading();
			return;
		}

		void loadDeckInfoForDeck(nextDeck).finally(() => {
			if (commanderLoadQueue.length === 0) {
				stopCommanderLoading();
				return;
			}

			commanderLoadHandle = setTimeout(() => {
				processCommanderQueue();
			}, COMMANDER_BATCH_DELAY);
		});
	}

	function scheduleCommanderLoading() {
		console.log('[ListLoadModal] scheduleCommanderLoading() called');
		stopCommanderLoading();

		if (!isOpen || !storage || decks.length === 0) {
			console.log('[ListLoadModal] Skipping deck info loading:', { isOpen, hasStorage: !!storage, decksLength: decks.length });
			return;
		}

		const pendingDecks = decks.filter((deck) => !deckInfoCache.has(deck.name));
		console.log('[ListLoadModal] Pending decks to load:', pendingDecks.length, pendingDecks.map(d => d.name));

		if (pendingDecks.length === 0) {
			console.log('[ListLoadModal] All deck info already cached');
			return;
		}

		commanderLoadQueue = pendingDecks.map((deck) => deck.name);
		isLoadingCommanders = true;

		console.log('[ListLoadModal] Scheduling deck info load queue with', commanderLoadQueue.length, 'decks');
		commanderLoadHandle = setTimeout(() => {
			console.log('[ListLoadModal] Starting deck info queue processing');
			processCommanderQueue();
		}, COMMANDER_BATCH_DELAY);
	}

	// Build browser items based on current folder
	function buildBrowserItems() {
		console.log('[ListLoadModal] buildBrowserItems() called');
		const items: BrowserItem[] = [];

		// Add folders at current level
		const childFolders = getChildFolders(folderStructure, currentFolderId);
		for (const folder of childFolders) {
			items.push({ type: 'folder', folder });
		}

		// Get decks at current level
		// NOTE: We DON'T include commander data here to avoid rebuilding when commanders load
		// Instead, commanders are read directly from commanderCache in the template
		const decksInFolder: Array<{ name: string; lastModified: Date }> = [];
		for (const deck of decks) {
			const deckFolderId = folderStructure.deckFolderMap[deck.name] || null;
			if (deckFolderId === currentFolderId) {
				decksInFolder.push({
					name: deck.name,
					lastModified: deck.lastModified
				});
			}
		}

		// Get ordered deck names and add them in order
		const deckNames = decksInFolder.map(d => d.name);
		const orderedDeckNames = getOrderedDecks(folderStructure, currentFolderId, deckNames);

		for (const deckName of orderedDeckNames) {
			const deck = decksInFolder.find(d => d.name === deckName);
			if (deck) {
				items.push({
					type: 'deck',
					deckName: deck.name,
					lastModified: deck.lastModified,
					commanders: [] // Placeholder - will read from cache in template
				});
			}
		}

		console.log('[ListLoadModal] buildBrowserItems() complete, items count:', items.length);
		browserItems = items;
	}

	// Load data when modal opens
	// IMPORTANT: Use untrack() to prevent circular dependencies
	$effect(() => {
		console.log('[ListLoadModal] Effect - isOpen changed:', isOpen);
		if (isOpen) {
			console.log('[ListLoadModal] Modal opening, loading data...');
			// Use untrack to prevent these operations from being tracked as dependencies
			untrack(() => {
				folderStructure = loadFolderStructure();
				buildBrowserItems();
				// Load commanders in the background without blocking the modal
				scheduleCommanderLoading();
			});
		} else {
			console.log('[ListLoadModal] Modal closing, stopping commander loading...');
			untrack(() => {
				stopCommanderLoading();
				openMenuDeckName = null;
				openMenuFolderId = null;
			});
		}
	});

	// Rebuild browser items when decks change (e.g., after delete/rename)
	$effect(() => {
		if (isOpen) {
			console.log('[ListLoadModal] Decks changed, rebuilding browser items...', decks.length, 'decks');
			buildBrowserItems();
			// Clean up cache for deleted decks
			const deckNames = new Set(decks.map(d => d.name));
			const cacheKeys = Array.from(deckInfoCache.keys());
			for (const key of cacheKeys) {
				if (!deckNames.has(key)) {
					console.log('[ListLoadModal] Removing deleted deck from cache:', key);
					const newCache = new Map(deckInfoCache);
					newCache.delete(key);
					deckInfoCache = newCache;
				}
			}
		}
	});

	// Close dropdown menu when clicking outside
	$effect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (openMenuDeckName || openMenuFolderId) {
				const target = event.target as HTMLElement;
				// Check if click is outside the dropdown
				if (!target.closest('.relative')) {
					openMenuDeckName = null;
					openMenuFolderId = null;
				}
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
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

	function confirmRenameDeck(deckName: string) {
		deckToRename = deckName;
		showRenameDeckModal = true;
	}

	async function handleRenameDeck(newName: string) {
		if (!deckToRename || !storage) return;

		const oldName = deckToRename;

		// Validate new name
		if (!newName || newName.trim() === '') {
			alert('Please enter a valid deck name');
			return;
		}

		if (newName === oldName) {
			showRenameDeckModal = false;
			deckToRename = null;
			return;
		}

		// Check if name already exists
		const existingDeck = decks.find(d => d.name === newName);
		if (existingDeck) {
			alert(`A deck with the name "${newName}" already exists`);
			return;
		}

		// Rename via storage manager
		const result = await storage.renameDeck(oldName, newName);
		if (result.success) {
			onrename?.(oldName, newName);
			showRenameDeckModal = false;
			deckToRename = null;
		} else {
			alert(`Failed to rename deck: ${result.error}`);
		}
	}

	function handleClose() {
		stopCommanderLoading();
		onclose?.();
		deckToDelete = null;
		currentFolderId = null;
		openMenuDeckName = null;
		openMenuFolderId = null;
	}

	// Folder navigation
	function navigateToFolder(folderId: string | null) {
		currentFolderId = folderId;
		buildBrowserItems();
	}

	function navigateUp() {
		if (currentFolderId === null) return;
		const currentFolder = getFolderById(folderStructure, currentFolderId);
		if (currentFolder) {
			currentFolderId = currentFolder.parentId;
			buildBrowserItems();
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
		buildBrowserItems();
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
		buildBrowserItems();
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
		buildBrowserItems();
	}

	function cancelDeleteFolder() {
		folderToDelete = null;
	}

	// Drag and drop
	function handleDragStart(deckName: string) {
		draggedDeckName = deckName;
		dropTargetDeckName = null;
		dropPosition = null;
	}

	function handleDragEnd() {
		draggedDeckName = null;
		dropTargetDeckName = null;
		dropPosition = null;
	}

	function handleDrop(targetFolderId: string | null) {
		if (!draggedDeckName) return;

		folderStructure = moveDeckToFolder(folderStructure, draggedDeckName, targetFolderId);
		saveFolderStructure(folderStructure);
		draggedDeckName = null;
		dropTargetDeckName = null;
		dropPosition = null;
		buildBrowserItems();
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	// Handle drag over a deck row to show insert position
	function handleDeckDragOver(event: DragEvent, targetDeckName: string) {
		if (!draggedDeckName || draggedDeckName === targetDeckName) {
			dropTargetDeckName = null;
			dropPosition = null;
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const midpoint = rect.top + rect.height / 2;
		const mouseY = event.clientY;

		dropTargetDeckName = targetDeckName;
		dropPosition = mouseY < midpoint ? 'above' : 'below';
	}

	// Handle drop on a deck row to reorder
	function handleDeckDrop(event: DragEvent, targetDeckName: string) {
		event.preventDefault();
		event.stopPropagation();

		if (!draggedDeckName || draggedDeckName === targetDeckName || !dropPosition) {
			dropTargetDeckName = null;
			dropPosition = null;
			return;
		}

		// Get all deck names in current folder
		const deckNames = browserItems
			.filter(item => item.type === 'deck')
			.map(item => (item as { deckName: string }).deckName);

		// Create new order
		const newOrder = [...deckNames];
		const draggedIndex = newOrder.indexOf(draggedDeckName);
		const targetIndex = newOrder.indexOf(targetDeckName);

		if (draggedIndex === -1 || targetIndex === -1) {
			dropTargetDeckName = null;
			dropPosition = null;
			return;
		}

		// Remove dragged deck from its current position
		newOrder.splice(draggedIndex, 1);

		// Calculate new insert position
		let insertIndex = newOrder.indexOf(targetDeckName);
		if (dropPosition === 'below') {
			insertIndex++;
		}

		// Insert at new position
		newOrder.splice(insertIndex, 0, draggedDeckName);

		// Save the new order
		folderStructure = reorderDecks(folderStructure, currentFolderId, newOrder);
		saveFolderStructure(folderStructure);

		// Clear drag state
		draggedDeckName = null;
		dropTargetDeckName = null;
		dropPosition = null;

		// Rebuild items
		buildBrowserItems();
	}

	// Breadcrumb path
	let breadcrumbs = $derived.by(() => {
		const path: { id: string | null; name: string }[] = [{ id: null, name: 'All Lists' }];
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

	// Helper to get mana symbol class for a color
	function getManaSymbolClass(color: string): string {
		const colorLower = color.toLowerCase();
		return `ms ms-${colorLower} ms-cost ms-shadow`;
	}

	// Helper to count decks in a folder
	function getDeckCountInFolder(folderId: string): number {
		return decks.filter(deck => {
			const deckFolderId = folderStructure.deckFolderMap[deck.name] || null;
			return deckFolderId === folderId;
		}).length;
	}
</script>

<BaseModal
	{isOpen}
	onClose={handleClose}
	title="Load List"
	subtitle="{decks.length} list{decks.length === 1 ? '' : 's'} available"
	size="custom"
	customSize="w-[80vw]"
	height="h-[95vh]"
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
		<div class="flex-1 overflow-y-auto relative z-10" ondragover={handleDragOver} ondrop={() => handleDrop(currentFolderId)} role="region" aria-label="List browser">
			{#if browserItems.length === 0 && decks.length === 0 && currentFolderId === null}
				<!-- No lists at all in the system -->
				<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
					<p>No lists found. Create a new list to get started!</p>
				</div>
			{:else}
				<table class="w-full pb-32">
					<thead class="sticky top-0 bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border)] z-10">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">List Name</th>
							<th class="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Commander</th>
							<th class="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Colors</th>
							<th class="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Format</th>
							<th class="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Modified</th>
							<th class="px-6 py-3 w-10"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
					<!-- Back/Up Navigation Row -->
					{#if currentFolderId !== null}
						<tr
							class="hover:bg-[var(--color-accent-blue)]/10 transition-colors cursor-pointer"
							ondragover={handleDragOver}
							ondrop={() => {
								const currentFolder = getFolderById(folderStructure, currentFolderId!);
								if (currentFolder) {
									handleDrop(currentFolder.parentId);
								}
							}}
							role="row"
							aria-label="Parent folder drop zone"
							onclick={navigateUp}
						>
							<td class="px-6 py-2" colspan="6">
								<div class="flex items-center gap-2">
									<span class="text-lg">⬆️</span>
									<div class="font-medium text-[var(--color-text-secondary)] text-sm">
										..
									</div>
								</div>
							</td>
						</tr>
					{/if}

					{#each browserItems as item}
						{#if item.type === 'folder'}
							<!-- Folder Item -->
							<tr
								class="hover:bg-[var(--color-accent-blue)]/10 transition-colors group"
								ondragover={handleDragOver}
								ondrop={() => handleDrop(item.folder.id)}
								role="row"
								aria-label="Folder drop zone"
							>
								<td class="px-6 py-2">
									<button
										type="button"
										class="flex items-center gap-2 text-left"
										onclick={() => navigateToFolder(item.folder.id)}
									>
										<span class="text-lg">📁</span>
										<div class="font-medium text-[var(--color-text-primary)] text-sm truncate">
											{item.folder.name}
											<span class="text-[var(--color-text-tertiary)] ml-1">
												({getDeckCountInFolder(item.folder.id)})
											</span>
										</div>
									</button>
								</td>
								<td class="px-6 py-2"></td>
								<td class="px-6 py-2"></td>
								<td class="px-6 py-2"></td>
								<td class="px-6 py-2"></td>
								<td class="px-6 py-2"></td>
								<td class="px-6 py-2 relative">
									<button
										type="button"
										class="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
										onclick={(e) => {
											e.stopPropagation();
											openMenuFolderId = openMenuFolderId === item.folder.id ? null : item.folder.id;
										}}
										aria-label="Folder options"
									>
										<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
											<circle cx="12" cy="5" r="2"/>
											<circle cx="12" cy="12" r="2"/>
											<circle cx="12" cy="19" r="2"/>
										</svg>
									</button>

									<!-- Dropdown menu -->
									{#if openMenuFolderId === item.folder.id}
										<div class="absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-[100]">
											<button
												type="button"
												class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
												onclick={(e) => {
													e.stopPropagation();
													confirmRenameFolder(item.folder);
													openMenuFolderId = null;
												}}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
												</svg>
												Rename
											</button>
											<button
												type="button"
												class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-red-500 flex items-center gap-2 border-t border-[var(--color-border)]"
												onclick={(e) => {
													e.stopPropagation();
													confirmDeleteFolder(item.folder);
													openMenuFolderId = null;
												}}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
												</svg>
												Delete
											</button>
										</div>
									{/if}
								</td>
							</tr>
						{:else}
							<!-- List Item -->
							<tr
								class="hover:bg-[var(--color-accent-blue)]/10 transition-colors cursor-move group relative"
								draggable="true"
								ondragstart={() => handleDragStart(item.deckName)}
								ondragend={handleDragEnd}
								ondragover={(e) => handleDeckDragOver(e, item.deckName)}
								ondrop={(e) => handleDeckDrop(e, item.deckName)}
								aria-label="Draggable list item"
								tabindex="0"
							>
								<!-- List Name - single click to load -->
								<td class="px-6 py-2 relative">
									<!-- Drop indicators -->
									{#if dropTargetDeckName === item.deckName && dropPosition === 'above'}
										<div class="absolute top-0 left-0 right-full h-0.5 bg-[var(--color-accent-blue)] z-20" style="width: 100vw;"></div>
									{/if}
									{#if dropTargetDeckName === item.deckName && dropPosition === 'below'}
										<div class="absolute bottom-0 left-0 right-full h-0.5 bg-[var(--color-accent-blue)] z-20" style="width: 100vw;"></div>
									{/if}
									<button
										type="button"
										class="text-left group/deckname"
										onclick={(e) => {
											e.stopPropagation();
											handleLoad(item.deckName);
										}}
									>
										<div class="font-medium text-[var(--color-text-primary)] group-hover/deckname:text-[var(--color-accent-blue)] text-sm truncate transition-colors relative">
											{item.deckName}
											<span class="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[var(--color-accent-blue)] group-hover/deckname:w-full transition-all duration-200"></span>
										</div>
									</button>
								</td>

								<!-- Commander Names -->
								<td class="px-6 py-2">
									{#if deckInfoCache.has(item.deckName)}
										{@const deckInfo = deckInfoCache.get(item.deckName)!}
										{#if deckInfo.commanders.length > 0}
											<div class="flex flex-col gap-0.5">
												{#each deckInfo.commanders as commander}
													<span class="text-sm text-[var(--color-text-secondary)] truncate">
														{commander.name}
													</span>
												{/each}
											</div>
										{:else if deckInfo.format === DeckFormat.Commander}
											<span class="text-sm text-[var(--color-text-tertiary)]">No commander</span>
										{:else}
											<span class="text-sm text-[var(--color-text-tertiary)]">—</span>
										{/if}
									{:else}
										<span class="text-sm text-[var(--color-text-tertiary)]">Loading...</span>
									{/if}
								</td>

								<!-- Colors -->
								<td class="px-6 py-2">
									{#if deckInfoCache.has(item.deckName)}
										{@const deckInfo = deckInfoCache.get(item.deckName)!}
										{#if deckInfo.commanders.length > 0}
											{@const allColors = [...new Set(deckInfo.commanders.flatMap(c => c.colorIdentity))]}
											{#if allColors.length > 0}
												<div class="flex gap-0.5">
													{#each allColors.sort() as color}
														<i class={getManaSymbolClass(color)}></i>
													{/each}
												</div>
											{:else}
												<i class="ms ms-c ms-cost ms-shadow"></i>
											{/if}
										{/if}
									{/if}
								</td>

								<!-- Format with Bracket -->
								<td class="px-6 py-2">
									<div class="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
										{#if deckInfoCache.has(item.deckName)}
											{@const deckInfo = deckInfoCache.get(item.deckName)!}
											{@const formatName = FORMAT_METADATA[deckInfo.format]?.displayName || deckInfo.format}
											{#if deckInfo.format === DeckFormat.Commander && deckInfo.commanders.length > 0 && deckInfo.commanders[0].bracketLevel !== undefined}
												{formatName} (Bracket {deckInfo.commanders[0].bracketLevel})
											{:else}
												{formatName}
											{/if}
										{:else}
											Loading...
										{/if}
									</div>
								</td>

								<!-- Last Modified -->
								<td class="px-6 py-2">
									<div class="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
										{formatDate(item.lastModified)}
									</div>
								</td>

								<!-- Three-dot menu -->
								<td class="px-6 py-2 relative">
									<button
										type="button"
										class="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
										onclick={(e) => {
											e.stopPropagation();
											openMenuDeckName = openMenuDeckName === item.deckName ? null : item.deckName;
										}}
										aria-label="List options"
									>
										<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
											<circle cx="12" cy="5" r="2"/>
											<circle cx="12" cy="12" r="2"/>
											<circle cx="12" cy="19" r="2"/>
										</svg>
									</button>

									<!-- Dropdown menu -->
									{#if openMenuDeckName === item.deckName}
										<div class="absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-[100]">
											<button
												type="button"
												class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] flex items-center gap-2"
												onclick={(e) => {
													e.stopPropagation();
													confirmRenameDeck(item.deckName);
													openMenuDeckName = null;
												}}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
												</svg>
												Rename
											</button>
											<button
												type="button"
												class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-red-500 flex items-center gap-2 border-t border-[var(--color-border)]"
												onclick={(e) => {
													e.stopPropagation();
													confirmDelete(item.deckName);
													openMenuDeckName = null;
												}}
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
												</svg>
												Delete
											</button>
										</div>
									{/if}
								</td>
							</tr>
						{/if}
					{/each}

					<!-- Empty folder message -->
					{#if browserItems.length === 0 && currentFolderId !== null}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
								<p>This folder is empty. Drag lists here or create a subfolder.</p>
							</td>
						</tr>
					{/if}
					</tbody>
				</table>
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

<!-- Delete List Confirmation Modal -->
<BaseModal isOpen={deckToDelete !== null} onClose={cancelDeleteDeck} title="Delete List?" size="md">
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
				All subfolders will be deleted and lists inside will be moved to the root level.
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

<!-- Rename Deck Modal -->
<FolderPromptModal
	bind:isOpen={showRenameDeckModal}
	title="Rename List"
	initialValue={deckToRename || ''}
	placeholder="List name"
	onConfirm={handleRenameDeck}
	onCancel={() => {
		showRenameDeckModal = false;
		deckToRename = null;
	}}
/>
