/**
 * Validation context system for action-aware validation
 */

import type { Card } from '$lib/types/card';
import type { Deck } from '$lib/types/deck';

/**
 * Validation actions/timing
 */
export enum ValidationContext {
	// Card operations
	ADDING_CARD = 'adding_card',
	REMOVING_CARD = 'removing_card',
	UPDATING_QUANTITY = 'updating_quantity',

	// Bulk operations
	BULK_IMPORT = 'bulk_import',
	BULK_EDIT = 'bulk_edit',

	// Deck operations
	DECK_CREATION = 'deck_creation',
	DECK_COMPLETE = 'deck_complete', // Final validation before save
	SWITCHING_BRANCH = 'switching_branch',

	// Commander operations
	SETTING_COMMANDER = 'setting_commander',
	REMOVING_COMMANDER = 'removing_commander',

	// Real-time checks
	LIVE_VALIDATION = 'live_validation' // For UI warnings
}

/**
 * Validation request
 */
export interface ValidationRequest {
	context: ValidationContext;
	deck: Deck;
	card?: Card; // For card-specific operations
	quantity?: number; // For quantity operations
}

/**
 * Validation warning severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Individual validation warning
 */
export interface ValidationWarning {
	type: ValidationSeverity;
	message: string;
	cardName?: string;
	category?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	isValid: boolean;
	warnings: ValidationWarning[];
}
