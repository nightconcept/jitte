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
	// Land subcategories - Guilds (2-color)
	{
		id: CubeCardCategory.LandAzorius,
		label: 'Azorius',
		icon: 'ms-wu',
		order: 10,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandDimir,
		label: 'Dimir',
		icon: 'ms-ub',
		order: 11,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandRakdos,
		label: 'Rakdos',
		icon: 'ms-br',
		order: 12,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandGruul,
		label: 'Gruul',
		icon: 'ms-rg',
		order: 13,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandSelesnya,
		label: 'Selesnya',
		icon: 'ms-gw',
		order: 14,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandOrzhov,
		label: 'Orzhov',
		icon: 'ms-wb',
		order: 15,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandIzzet,
		label: 'Izzet',
		icon: 'ms-ur',
		order: 16,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandGolgari,
		label: 'Golgari',
		icon: 'ms-bg',
		order: 17,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandBoros,
		label: 'Boros',
		icon: 'ms-rw',
		order: 18,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandSimic,
		label: 'Simic',
		icon: 'ms-gu',
		order: 19,
		isRequired: false,
		allowMultiple: true
	},
	// Land subcategories - Shards (3-color allied)
	{
		id: CubeCardCategory.LandEsper,
		label: 'Esper',
		icon: 'ms-land',
		order: 20,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandGrixis,
		label: 'Grixis',
		icon: 'ms-land',
		order: 21,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandJund,
		label: 'Jund',
		icon: 'ms-land',
		order: 22,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandNaya,
		label: 'Naya',
		icon: 'ms-land',
		order: 23,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandBant,
		label: 'Bant',
		icon: 'ms-land',
		order: 24,
		isRequired: false,
		allowMultiple: true
	},
	// Land subcategories - Wedges (3-color enemy)
	{
		id: CubeCardCategory.LandAbzan,
		label: 'Abzan',
		icon: 'ms-land',
		order: 25,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandJeskai,
		label: 'Jeskai',
		icon: 'ms-land',
		order: 26,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandSultai,
		label: 'Sultai',
		icon: 'ms-land',
		order: 27,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandMardu,
		label: 'Mardu',
		icon: 'ms-land',
		order: 28,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandTemur,
		label: 'Temur',
		icon: 'ms-land',
		order: 29,
		isRequired: false,
		allowMultiple: true
	},
	// Land subcategories - 4-color and generic
	{
		id: CubeCardCategory.LandFourColor,
		label: '4-Color',
		icon: 'ms-land',
		order: 30,
		isRequired: false,
		allowMultiple: true
	},
	{
		id: CubeCardCategory.LandGeneric,
		label: 'Other',
		icon: 'ms-land',
		order: 31,
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
 * Returns only 8 display categories (with "lands" as virtual aggregating category)
 */
export function getCubeCategoriesInOrder(): CategoryDefinition[] {
	// Return only the 7 main categories + the virtual lands category
	const displayCategories: CategoryDefinition[] = [
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
			id: 'lands', // Virtual category for display
			label: 'Lands',
			icon: 'ms-land',
			order: 7,
			isRequired: false,
			allowMultiple: true
		}
	];

	return displayCategories;
}
