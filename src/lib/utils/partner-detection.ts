/**
 * Partner commander detection and validation utilities
 */

import type { Card, ValidationWarning, ValidationWarningType } from '$lib/types/card';

export type PartnerType = 'partner' | 'partner_with' | 'friends_forever' | 'choose_background' | null;

/**
 * Detect the type of partner ability a card has
 */
export function detectPartnerType(card: Card): PartnerType {
	const keywords = card.keywords?.map(k => k.toLowerCase()) || [];
	const oracleText = card.oracleText?.toLowerCase() || '';

	// Check for "Choose a Background"
	if (keywords.includes('choose a background') || oracleText.includes('choose a background')) {
		return 'choose_background';
	}

	// Check for "Friends Forever"
	if (keywords.includes('friends forever') || oracleText.includes('friends forever')) {
		return 'friends_forever';
	}

	// Check for "Partner with [name]"
	if (keywords.some(k => k.startsWith('partner with')) || oracleText.match(/partner with [^.,\n]+/i)) {
		return 'partner_with';
	}

	// Check for generic "Partner"
	if (keywords.includes('partner') || oracleText.includes('partner')) {
		return 'partner';
	}

	return null;
}

/**
 * Extract the specific partner name from "Partner with [name]" ability
 */
export function getPartnerWithName(card: Card): string | null {
	const oracleText = card.oracleText || '';
	const keywords = card.keywords || [];

	// Check keywords first
	for (const keyword of keywords) {
		const match = keyword.match(/partner with (.+)/i);
		if (match) {
			return match[1].trim();
		}
	}

	// Check oracle text as fallback
	const match = oracleText.match(/partner with ([^.,\n]+)/i);
	if (match) {
		return match[1].trim();
	}

	return null;
}

/**
 * Check if two cards can be partners together
 */
export function canBePartners(card1: Card, card2: Card): boolean {
	const type1 = detectPartnerType(card1);
	const type2 = detectPartnerType(card2);

	// Both must have partner abilities
	if (!type1 || !type2) {
		return false;
	}

	// Cannot mix different partner types (except regular partner and partner_with can work together if names match)
	if (type1 !== type2) {
		// Special case: partner_with can work with partner if the names match
		if ((type1 === 'partner_with' || type2 === 'partner_with') &&
		    (type1 === 'partner' || type2 === 'partner')) {
			// Check if the partner_with card specifies the other card
			const partnerWithCard = type1 === 'partner_with' ? card1 : card2;
			const otherCard = type1 === 'partner_with' ? card2 : card1;
			const specifiedName = getPartnerWithName(partnerWithCard);
			return specifiedName?.toLowerCase() === otherCard.name.toLowerCase();
		}
		return false;
	}

	// For partner_with, check if they specify each other
	if (type1 === 'partner_with') {
		const name1 = getPartnerWithName(card1);
		const name2 = getPartnerWithName(card2);
		return name1?.toLowerCase() === card2.name.toLowerCase() &&
		       name2?.toLowerCase() === card1.name.toLowerCase();
	}

	// For regular partner, friends forever, they can pair with any card of the same type
	return true;
}

/**
 * Validate partner compatibility for a deck's commanders
 */
export function validatePartnerCompatibility(commanders: Card[]): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	if (commanders.length === 0) {
		return warnings;
	}

	if (commanders.length === 1) {
		// Single commander doesn't need partner ability
		return warnings;
	}

	if (commanders.length > 2) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: 'Cannot have more than 2 commanders',
			severity: 'error'
		});
		return warnings;
	}

	// We have exactly 2 commanders
	const [commander1, commander2] = commanders;
	const type1 = detectPartnerType(commander1);
	const type2 = detectPartnerType(commander2);

	// Check if first commander has partner ability
	if (!type1) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: `${commander1.name} does not have a partner ability`,
			cardName: commander1.name,
			severity: 'error'
		});
	}

	// Check if second commander has partner ability
	if (!type2) {
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: `${commander2.name} does not have a partner ability`,
			cardName: commander2.name,
			severity: 'error'
		});
	}

	// If both have partner abilities, check compatibility
	if (type1 && type2 && !canBePartners(commander1, commander2)) {
		const reason = getIncompatibilityReason(commander1, commander2, type1, type2);
		warnings.push({
			type: 'invalid_commander' as ValidationWarningType,
			message: `${commander1.name} and ${commander2.name} cannot be partners: ${reason}`,
			severity: 'error'
		});
	}

	return warnings;
}

/**
 * Get human-readable reason why two cards cannot be partners
 */
function getIncompatibilityReason(card1: Card, card2: Card, type1: PartnerType, type2: PartnerType): string {
	if (type1 !== type2) {
		return `different partner types (${formatPartnerType(type1)} and ${formatPartnerType(type2)})`;
	}

	if (type1 === 'partner_with') {
		const name1 = getPartnerWithName(card1);
		const name2 = getPartnerWithName(card2);
		if (name1?.toLowerCase() !== card2.name.toLowerCase()) {
			return `${card1.name} can only partner with ${name1}`;
		}
		if (name2?.toLowerCase() !== card1.name.toLowerCase()) {
			return `${card2.name} can only partner with ${name2}`;
		}
	}

	return 'incompatible partner abilities';
}

/**
 * Format partner type for display
 */
export function formatPartnerType(type: PartnerType): string {
	if (!type) return 'no partner ability';

	switch (type) {
		case 'partner':
			return 'Partner';
		case 'partner_with':
			return 'Partner With';
		case 'friends_forever':
			return 'Friends Forever';
		case 'choose_background':
			return 'Choose a Background';
		default:
			return type;
	}
}

/**
 * Check if a card can have a partner added
 */
export function canAddPartner(card: Card): boolean {
	const type = detectPartnerType(card);
	return type !== null;
}

/**
 * Check if a card is a Background (for "Choose a Background")
 */
export function isBackground(card: Card): boolean {
	const types = card.types?.map(t => t.toLowerCase()) || [];
	const typeLine = card.oracleText?.toLowerCase() || '';

	// Check if it's an enchantment with "Background" subtype
	return types.includes('enchantment') &&
	       (types.includes('background') || typeLine.includes('background'));
}
