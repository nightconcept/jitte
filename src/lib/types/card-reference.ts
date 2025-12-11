/**
 * Card Reference Types
 *
 * Slim card representation for storage. Contains only the minimal data needed
 * to identify a card and its printing. Full card data is hydrated from the
 * Scryfall cache (IndexedDB) on load.
 *
 * Size comparison:
 * - Full Card object: ~2000-3000 bytes
 * - CardReference: ~80-120 bytes
 * - ~25x reduction in storage size
 */

/**
 * Minimal card reference for storage
 * All other card data (name, types, oracle text, etc.) is fetched from Scryfall cache
 */
export interface CardReference {
	/** Scryfall UUID - primary key for cache lookup */
	scryfallId: string;

	/** Number of copies in the deck */
	quantity: number;

	/** Set code for specific printing (e.g., "CMM", "MH2") */
	setCode: string;

	/** Collector number for specific printing (e.g., "205", "123a") */
	collectorNumber: string;

	// Optional overrides (primarily for Cube format)

	/** Custom CMC override (Cube format) */
	customCmc?: number;

	/** Custom color identity override (Cube format) */
	customColorIdentity?: string[];

	/** Custom category override (Cube format) */
	customCategory?: string;
}

/**
 * Card references organized by category
 * Mirrors CardsByCategory but with slim references
 */
export type CardReferencesByCategory = Record<string, CardReference[]>;

/**
 * Identifier for a specific card printing (without quantity/overrides)
 * Used in delta operations for removed/modified cards
 */
export interface CardReferenceIdentifier {
	scryfallId: string;
	setCode: string;
	collectorNumber: string;
}

/**
 * Placeholder card data for cards that couldn't be hydrated from cache
 * (deleted from Scryfall, API errors, etc.)
 */
export interface CardReferencePlaceholder extends CardReference {
	/** Card name stored for display when hydration fails */
	fallbackName: string;

	/** Error message explaining why hydration failed */
	hydrationError: string;

	/** Whether this card is in an error state */
	isPlaceholder: true;
}

/**
 * Type guard to check if a reference is a placeholder
 */
export function isCardReferencePlaceholder(
	ref: CardReference | CardReferencePlaceholder
): ref is CardReferencePlaceholder {
	return 'isPlaceholder' in ref && ref.isPlaceholder === true;
}

/**
 * Maybeboard category with slim card references
 */
export interface MaybeboardCategoryReference {
	id: string;
	name: string;
	cards: CardReference[];
	/** Optional description */
	description?: string;
	/** Order index for display */
	order: number;
	/** ISO timestamp of creation */
	createdAt: string;
	/** ISO timestamp of last update */
	updatedAt: string;
}

/**
 * Maybeboard with slim card references
 */
export interface MaybeboardReference {
	categories: MaybeboardCategoryReference[];
	defaultCategoryId: string;
}

/**
 * Stash with slim card references
 */
export interface StashReference {
	cards: CardReferencesByCategory;
	stashedAt: string;
	message?: string;
}
