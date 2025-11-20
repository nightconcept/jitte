/**
 * Commander format category definitions
 * Type-based categorization (creatures, instants, sorceries, etc.)
 */

import type { CategoryDefinition, CategorySchema } from '$lib/types/card';
import { CardCategory } from '$lib/types/card';

/**
 * Default categories for Commander format
 * Based on card types (type-line based categorization)
 */
export const COMMANDER_CATEGORIES: CategoryDefinition[] = [
	{
		id: CardCategory.Commander,
		label: 'Commander',
		icon: '',
		order: 0,
		isRequired: true,
		minCards: 1,
		maxCards: 2,
		allowMultiple: false
	},
	{
		id: CardCategory.Companion,
		label: 'Companion',
		icon: 'ms-planeswalker',
		order: 1,
		isRequired: false,
		maxCards: 1,
		allowMultiple: false
	},
	{
		id: CardCategory.Planeswalker,
		label: 'Planeswalkers',
		icon: 'ms-planeswalker',
		order: 2,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Creature,
		label: 'Creatures',
		icon: 'ms-creature',
		order: 3,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Instant,
		label: 'Instants',
		icon: 'ms-instant',
		order: 4,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Sorcery,
		label: 'Sorceries',
		icon: 'ms-sorcery',
		order: 5,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Artifact,
		label: 'Artifacts',
		icon: 'ms-artifact',
		order: 6,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Enchantment,
		label: 'Enchantments',
		icon: 'ms-enchantment',
		order: 7,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Land,
		label: 'Lands',
		icon: 'ms-land',
		order: 8,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CardCategory.Other,
		label: 'Other',
		icon: '',
		order: 9,
		isRequired: false,
		allowMultiple: true
	}
];

/**
 * Commander category schema (includes default category)
 */
export const COMMANDER_CATEGORY_SCHEMA: CategorySchema = {
	categories: COMMANDER_CATEGORIES,
	defaultCategoryId: CardCategory.Other
};

/**
 * Get Commander category definition by ID
 */
export function getCommanderCategory(categoryId: string): CategoryDefinition | undefined {
	return COMMANDER_CATEGORIES.find((cat) => cat.id === categoryId);
}

/**
 * Get all Commander categories in display order
 */
export function getCommanderCategoriesInOrder(): CategoryDefinition[] {
	return [...COMMANDER_CATEGORIES].sort((a, b) => a.order - b.order);
}
