/**
 * Cube format category definitions
 * Color-based categorization (WUBRG + colorless/multicolored/lands)
 */

import type { CategoryDefinition, CategorySchema } from '$lib/types/card';
import { CubeCardCategory } from '$lib/types/card';

/**
 * Default categories for Cube format
 * Based on color identity
 */
export const CUBE_CATEGORIES: CategoryDefinition[] = [
	{
		id: CubeCardCategory.White,
		label: 'White',
		icon: 'ms-w',
		order: 0,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Blue,
		label: 'Blue',
		icon: 'ms-u',
		order: 1,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Black,
		label: 'Black',
		icon: 'ms-b',
		order: 2,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Red,
		label: 'Red',
		icon: 'ms-r',
		order: 3,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Green,
		label: 'Green',
		icon: 'ms-g',
		order: 4,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Colorless,
		label: 'Colorless',
		icon: 'ms-c',
		order: 5,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Multicolored,
		label: 'Multicolored',
		icon: 'ms-multiple',
		order: 6,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.Lands,
		label: 'Lands',
		icon: 'ms-land',
		order: 7,
		isRequired: false,
		allowMultiple: true
	}
];

/**
 * Cube category schema (colorless as default for uncategorizable cards)
 */
export const CUBE_CATEGORY_SCHEMA: CategorySchema = {
	categories: CUBE_CATEGORIES,
	defaultCategoryId: CubeCardCategory.Colorless
};

/**
 * Get Cube category definition by ID
 */
export function getCubeCategory(categoryId: string): CategoryDefinition | undefined {
	return CUBE_CATEGORIES.find((cat) => cat.id === categoryId);
}

/**
 * Get all Cube categories in display order (WUBRG order)
 */
export function getCubeCategoriesInOrder(): CategoryDefinition[] {
	return [...CUBE_CATEGORIES].sort((a, b) => a.order - b.order);
}
