/**
 * Maybeboard type definitions
 */

import type { Card } from './card';

/**
 * A single maybeboard category
 */
export interface MaybeboardCategory {
	/** Unique identifier for this category */
	id: string;

	/** Display name (e.g., "Burn Package", "Card Draw") */
	name: string;

	/** Cards in this category */
	cards: Card[];

	/** Optional description or notes */
	description?: string;

	/** Order index for display */
	order: number;

	/** ISO timestamp of creation */
	createdAt: string;

	/** ISO timestamp of last update */
	updatedAt: string;
}

/**
 * Complete maybeboard structure
 * Shared across all versions/branches of a deck
 */
export interface Maybeboard {
	/** Array of categories */
	categories: MaybeboardCategory[];

	/** Default category ID (typically "main") */
	defaultCategoryId: string;
}

/**
 * Factory function result for creating a new category
 */
export interface CreateCategoryOptions {
	name: string;
	description?: string;
}

/**
 * Constants for default maybeboard setup
 */
export const MAYBEBOARD_DEFAULTS = {
	DEFAULT_CATEGORY_NAME: 'Main',
	DEFAULT_CATEGORY_ID: 'main'
} as const;
