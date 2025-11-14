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
	import { extractCommanderInfo, type CommanderInfo } from '$lib/utils/deck-info-extractor';
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
	let commanderCache = $state<Map<string, CommanderInfo[]>>(new Map());

	// UI state
	let deckToDelete = $state<string | null>(null);
	let folderToDelete = $state<Folder | null>(null);
	let folderToRename = $state<Folder | null>(null);
	let showNewFolderModal = $state(false);
	let showRenameFolderModal = $state(false);
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

	async function loadCommanderForDeck(deckName: string) {
		if (!storage) return;

		console.log('[DeckPickerModal] loadCommanderForDeck() called for:', deckName);
		try {
			const result = await storage.loadDeck(deckName);
			if (result.success && result.data) {
				console.log('[DeckPickerModal] Extracting commander info for:', deckName);
				const commanders = await extractCommanderInfo(result.data);
				console.log('[DeckPickerModal] Commander info extracted:', commanders);
				// Create a new Map to trigger reactivity
				commanderCache = new Map(commanderCache.set(deckName, commanders));
			} else {
				console.log('[DeckPickerModal] Failed to load deck:', deckName);
				commanderCache = new Map(commanderCache.set(deckName, []));
			}
		} catch (error) {
			console.error(`[DeckPickerModal] Failed to load commanders for ${deckName}:`, error);
			commanderCache = new Map(commanderCache.set(deckName, []));
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

		void loadCommanderForDeck(nextDeck).finally(() => {
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
		console.log('[DeckPickerModal] scheduleCommanderLoading() called');
		stopCommanderLoading();

		if (!isOpen || !storage || decks.length === 0) {
			console.log('[DeckPickerModal] Skipping commander loading:', { isOpen, hasStorage: !!storage, decksLength: decks.length });
			return;
		}

		const pendingDecks = decks.filter((deck) => !commanderCache.has(deck.name));
		console.log('[DeckPickerModal] Pending decks to load:', pendingDecks.length, pendingDecks.map(d => d.name));

		if (pendingDecks.length === 0) {
			console.log('[DeckPickerModal] All commanders already cached');
			return;
		}

		commanderLoadQueue = pendingDecks.map((deck) => deck.name);
		isLoadingCommanders = true;

		console.log('[DeckPickerModal] Scheduling commander load queue with', commanderLoadQueue.length, 'decks');
		commanderLoadHandle = setTimeout(() => {
			console.log('[DeckPickerModal] Starting commander queue processing');
			processCommanderQueue();
		}, COMMANDER_BATCH_DELAY);
	}

	// Build browser items based on current folder
	function buildBrowserItems() {
		console.log('[DeckPickerModal] buildBrowserItems() called');
		const items: BrowserItem[] = [];

		// Add folders at current level
		const childFolders = getChildFolders(folderStructure, currentFolderId);
		for (const folder of childFolders) {
			items.push({ type: 'folder', folder });
		}

		// Get decks at current level
		// NOTE: We DON'T include commander data here to avoid rebuilding when commanders load
		// Instead, commanders are read directly from commanderCache in the template
		const decksInFolder: Array<{ name: string; lastModified: Date; size: number }> = [];
		for (const deck of decks) {
			const deckFolderId = folderStructure.deckFolderMap[deck.name] || null;
			if (deckFolderId === currentFolderId) {
				decksInFolder.push({
					name: deck.name,
					lastModified: deck.lastModified,
					size: deck.size
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
					size: deck.size,
					commanders: [] // Placeholder - will read from cache in template
				});
			}
		}

		console.log('[DeckPickerModal] buildBrowserItems() complete, items count:', items.length);
		browserItems = items;
	}

	// Load data when modal opens
	// IMPORTANT: Use untrack() to prevent circular dependencies
	$effect(() => {
		console.log('[DeckPickerModal] Effect - isOpen changed:', isOpen);
		if (isOpen) {
			console.log('[DeckPickerModal] Modal opening, loading data...');
			// Use untrack to prevent these operations from being tracked as dependencies
			untrack(() => {
				folderStructure = loadFolderStructure();
				buildBrowserItems();
				// Load commanders in the background without blocking the modal
				scheduleCommanderLoading();
			});
		} else {
			console.log('[DeckPickerModal] Modal closing, stopping commander loading...');
			untrack(() => {
				stopCommanderLoading();
				openMenuDeckName = null;
				openMenuFolderId = null;
			});
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
	title="Load Deck"
	subtitle="{decks.length} deck{decks.length === 1 ? '' : 's'} available"
	size="custom"
	customSize="w-[80vw]"
	height="max-h-[90vh]"
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
			{#if browserItems.length === 0 && decks.length === 0 && currentFolderId === null}
				<!-- No decks at all in the system -->
				<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
					<p>No decks found. Create a new deck to get started!</p>
				</div>
			{:else}
				<!-- Column Headers -->
				<div class="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] z-10">
					<div class="px-6 py-3 grid grid-cols-[1.5fr_2fr_1fr_auto_auto_auto_auto] gap-6 items-center text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
						<div>Deck Name</div>
						<div>Commander</div>
						<div>Colors</div>
						<div>Format</div>
						<div class="text-right">Modified</div>
						<div class="text-right w-20">Size</div>
						<div class="w-10"></div>
					</div>
				</div>
				<div class="divide-y divide-[var(--color-border)]">
					<!-- Back/Up Navigation Row -->
					{#if currentFolderId !== null}
						<div
							class="px-6 py-2 hover:bg-[var(--color-accent-blue)]/10 transition-colors cursor-pointer"
							ondragover={handleDragOver}
							ondrop={() => {
								const currentFolder = getFolderById(folderStructure, currentFolderId!);
								if (currentFolder) {
									handleDrop(currentFolder.parentId);
								}
							}}
							role="region"
							aria-label="Parent folder drop zone"
						>
							<button
								type="button"
								class="flex-1 text-left min-w-0 grid grid-cols-[1.5fr_2fr_1fr_auto_auto_auto] gap-6 items-center w-full"
								onclick={navigateUp}
							>
								<!-- Back indicator with icon -->
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-lg">⬆️</span>
									<div class="font-medium text-[var(--color-text-secondary)] text-sm truncate">
										..
									</div>
								</div>

								<!-- Empty columns to match deck layout -->
								<div></div>
								<div></div>
								<div></div>
								<div></div>
								<div class="w-20"></div>
								<div class="w-10"></div>
							</button>
						</div>
					{/if}

					{#each browserItems as item}
						{#if item.type === 'folder'}
							<!-- Folder Item -->
							<div
								class="px-6 py-2 hover:bg-[var(--color-accent-blue)]/10 transition-colors relative group"
								ondragover={handleDragOver}
								ondrop={() => handleDrop(item.folder.id)}
								role="region"
								aria-label="Folder drop zone"
							>
								<div class="flex items-center gap-6">
									<!-- Main content area - single-click to open folder -->
									<button
										type="button"
										class="flex-1 text-left min-w-0 grid grid-cols-[1.5fr_2fr_1fr_auto_auto_auto] gap-6 items-center"
										onclick={() => navigateToFolder(item.folder.id)}
									>
										<!-- Folder Name with Icon -->
										<div class="flex items-center gap-2 min-w-0">
											<span class="text-lg">📁</span>
											<div class="font-medium text-[var(--color-text-primary)] text-sm truncate">
												{item.folder.name}
												<span class="text-[var(--color-text-tertiary)] ml-1">
													({getDeckCountInFolder(item.folder.id)})
												</span>
											</div>
										</div>

										<!-- Empty columns to match deck layout -->
										<div></div>
										<div></div>
										<div></div>
										<div></div>
										<div class="w-20"></div>
									</button>

									<!-- Three-dot menu -->
									<div class="relative w-10">
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
											<div class="absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50">
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
									</div>
								</div>
							</div>
						{:else}
							<!-- Deck Item -->
							<div
								class="px-6 py-2 hover:bg-[var(--color-accent-blue)]/10 transition-colors cursor-move relative group"
								draggable="true"
								ondragstart={() => handleDragStart(item.deckName)}
								ondragend={handleDragEnd}
								ondragover={(e) => handleDeckDragOver(e, item.deckName)}
								ondrop={(e) => handleDeckDrop(e, item.deckName)}
								role="button"
								aria-label="Draggable deck item"
								tabindex="0"
							>
								<!-- Drop indicator -->
								{#if dropTargetDeckName === item.deckName && dropPosition === 'above'}
									<div class="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-accent-blue)] z-20"></div>
								{/if}
								{#if dropTargetDeckName === item.deckName && dropPosition === 'below'}
									<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-blue)] z-20"></div>
								{/if}
								<div class="flex items-center gap-6">
									<!-- Deck content grid -->
									<div
										class="flex-1 text-left min-w-0 grid grid-cols-[1.5fr_2fr_1fr_auto_auto_auto] gap-6 items-center"
									>
										<!-- Deck Name - single click to load -->
										<button
											type="button"
											class="min-w-0 text-left group/deckname"
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

										<!-- Commander Names -->
										<div class="min-w-0">
											{#if commanderCache.has(item.deckName)}
												{@const commanders = commanderCache.get(item.deckName)!}
												{#if commanders.length > 0}
													<div class="flex flex-col gap-0.5">
														{#each commanders as commander}
															<span class="text-sm text-[var(--color-text-secondary)] truncate">
																{commander.name}
															</span>
														{/each}
													</div>
												{:else}
													<span class="text-sm text-[var(--color-text-tertiary)]">No commander</span>
												{/if}
											{:else}
												<span class="text-sm text-[var(--color-text-tertiary)]">Loading...</span>
											{/if}
										</div>

										<!-- Colors -->
										<div class="flex items-center">
											{#if commanderCache.has(item.deckName)}
												{@const commanders = commanderCache.get(item.deckName)!}
												{#if commanders.length > 0}
													{@const allColors = [...new Set(commanders.flatMap(c => c.colorIdentity))]}
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
										</div>

										<!-- Format with Bracket -->
										<div class="text-sm text-[var(--color-text-secondary)]">
											{#if commanderCache.has(item.deckName)}
												{@const commanders = commanderCache.get(item.deckName)!}
												{#if commanders.length > 0 && commanders[0].bracketLevel !== undefined}
													Commander (Bracket {commanders[0].bracketLevel})
												{:else}
													Commander
												{/if}
											{:else}
												Commander
											{/if}
										</div>

										<!-- Last Modified -->
										<div class="text-sm text-[var(--color-text-secondary)] text-right whitespace-nowrap">
											{formatDate(item.lastModified)}
										</div>

										<!-- Size -->
										<div class="text-sm text-[var(--color-text-secondary)] text-right whitespace-nowrap w-20">
											{formatSize(item.size)}
										</div>
									</div>

									<!-- Three-dot menu -->
									<div class="relative w-10">
										<button
											type="button"
											class="p-2 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
											onclick={(e) => {
												e.stopPropagation();
												openMenuDeckName = openMenuDeckName === item.deckName ? null : item.deckName;
											}}
											aria-label="Deck options"
										>
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
												<circle cx="12" cy="5" r="2"/>
												<circle cx="12" cy="12" r="2"/>
												<circle cx="12" cy="19" r="2"/>
											</svg>
										</button>

										<!-- Dropdown menu -->
										{#if openMenuDeckName === item.deckName}
											<div class="absolute right-0 top-full mt-1 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-xl z-50">
												<button
													type="button"
													class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-surface-hover)] text-red-500 flex items-center gap-2"
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
									</div>
								</div>
							</div>
						{/if}
					{/each}

					<!-- Empty folder message -->
					{#if browserItems.length === 0 && currentFolderId !== null}
						<div class="px-6 py-8 text-center text-[var(--color-text-secondary)]">
							<p>This folder is empty. Drag decks here or create a subfolder.</p>
						</div>
					{/if}
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
