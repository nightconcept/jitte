/**
 * Plaintext decklist parser and serializer
 * Supports Arena/MTGO format with optional set codes
 */

import type { Card } from '$lib/types';

/**
 * Parse result from plaintext decklist
 */
export interface ParseResult {
	/** Successfully parsed cards */
	cards: Card[];

	/** Lines that failed to parse */
	errors: ParseError[];

	/** Total lines processed */
	totalLines: number;

	/** Commander card name (if detected from [Commander{top}] tag) */
	commanderName?: string;
}

/**
 * Parse error information
 */
export interface ParseError {
	line: number;
	text: string;
	reason: string;
}

/**
 * Parses a plaintext decklist into Card objects
 *
 * Supported formats:
 * - "1 Lightning Bolt"
 * - "1 Sol Ring (2XM) 97"
 * - "2x Lightning Bolt"
 * - "Lightning Bolt" (assumes quantity 1)
 *
 * @param text - The plaintext decklist
 * @returns ParseResult with cards and any errors
 */
export function parsePlaintext(text: string): ParseResult {
	const lines = text.split('\n');
	const cards: Card[] = [];
	const errors: ParseError[] = [];
	let commanderName: string | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		const lineNumber = i + 1;

		// Skip empty lines and comments
		if (!line || line.startsWith('//') || line.startsWith('#')) {
			continue;
		}

		// Skip section headers (e.g., "Commander:", "Deck:", "Sideboard:")
		if (line.endsWith(':')) {
			continue;
		}

		// Check if this line is tagged as commander
		const isCommander = hasCommanderTag(line);

		try {
			const card = parseLine(line);
			if (card) {
				cards.push(card);
				// If this is tagged as commander, save it
				if (isCommander && !commanderName) {
					commanderName = card.name;
				}
			}
		} catch (error) {
			errors.push({
				line: lineNumber,
				text: line,
				reason: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	return {
		cards,
		errors,
		totalLines: lines.length,
		commanderName
	};
}

/**
 * Checks if a line has the [Commander{top}] tag (Archidekt format)
 */
export function hasCommanderTag(line: string): boolean {
	return line.includes('[Commander{top}]') || line.includes('[Commander]');
}

/**
 * Cleans a line from Archidekt format by removing tags and finish indicators
 *
 * Examples:
 * - "1x Card (set) 123 *F* [Tag] ^custom^" -> "1x Card (set) 123"
 * - "1x Card (set) 123 [Tag]" -> "1x Card (set) 123"
 * - "1x Card (set) 123" -> "1x Card (set) 123" (unchanged)
 */
function cleanArchidektLine(line: string): string {
	// Remove everything from the first '[' onwards (tags and custom tags)
	let cleaned = line.split('[')[0].trim();

	// Remove finish indicators like *F*, *E*, etc. (asterisk, letter, asterisk)
	// Pattern: space followed by *{one or more letters}* followed by optional space
	cleaned = cleaned.replace(/\s+\*[A-Z]+\*\s*/gi, ' ').trim();

	return cleaned;
}

/**
 * Parses a single line into a Card object
 *
 * Examples:
 * - "1 Lightning Bolt" -> { name: "Lightning Bolt", quantity: 1 }
 * - "1 Sol Ring (2XM) 97" -> { name: "Sol Ring", quantity: 1, setCode: "2XM", collectorNumber: "97" }
 * - "1 Kenrith, the Returned King (plst) ELD-303" -> { name: "Kenrith, the Returned King", quantity: 1, setCode: "plst", collectorNumber: "ELD-303" }
 * - "2x Counterspell" -> { name: "Counterspell", quantity: 2 }
 * - "1x Card (set) 123 *F* [Tag]" -> { name: "Card", quantity: 1, setCode: "set", collectorNumber: "123" }
 *
 * @param line - Single line from decklist
 * @returns Card object or null if invalid
 */
function parseLine(line: string): Card | null {
	// Clean Archidekt format tags and finish indicators
	const cleanedLine = cleanArchidektLine(line);
	// Pattern: [quantity][x?] [card name] [(set) collector]?
	// Examples:
	//   1 Lightning Bolt
	//   2x Counterspell
	//   1 Sol Ring (2XM) 97
	//   1 Kenrith (plst) ELD-303

	const patterns = [
		// Pattern 1: "1 CardName (SET) 123" or "1 CardName (SET) ELD-123" or "1 CardName (SET) 54★"
		// Allow alphanumeric, hyphens, and special symbols (★, •, etc.) in collector numbers
		/^(\d+)x?\s+(.+?)\s+\(([A-Z0-9]+)\)\s+([A-Z0-9\-★•†‡§¶#*]+)$/i,
		// Pattern 2: "1 CardName (SET)"
		/^(\d+)x?\s+(.+?)\s+\(([A-Z0-9]+)\)$/i,
		// Pattern 3: "1 CardName" or "1x CardName"
		/^(\d+)x?\s+(.+)$/i,
		// Pattern 4: "CardName" (no quantity, assume 1)
		/^([^0-9].+)$/
	];

	for (const pattern of patterns) {
		const match = cleanedLine.match(pattern);
		if (match) {
			// Pattern 1: full format with set and collector number
			if (match.length === 5) {
				return {
					quantity: parseInt(match[1], 10),
					name: match[2].trim(),
					setCode: match[3].toUpperCase(),
					collectorNumber: match[4]
				};
			}

			// Pattern 2: with set code only
			if (match.length === 4 && match[3]) {
				return {
					quantity: parseInt(match[1], 10),
					name: match[2].trim(),
					setCode: match[3].toUpperCase()
				};
			}

			// Pattern 3: quantity and name only
			if (match.length === 3 && match[1].match(/^\d+$/)) {
				return {
					quantity: parseInt(match[1], 10),
					name: match[2].trim()
				};
			}

			// Pattern 4: name only (quantity = 1)
			if (match.length === 2) {
				return {
					quantity: 1,
					name: match[1].trim()
				};
			}
		}
	}

	throw new Error(`Unable to parse line: ${line}`);
}

/**
 * Serializes cards to plaintext format
 *
 * @param cards - Array of cards to serialize
 * @param includeSetCodes - Whether to include set codes (default: true)
 * @returns Plaintext decklist string
 */
export function serializePlaintext(cards: Card[], includeSetCodes = true): string {
	const lines: string[] = [];

	for (const card of cards) {
		let line = `${card.quantity} ${card.name}`;

		if (includeSetCodes && card.setCode) {
			line += ` (${card.setCode})`;

			if (card.collectorNumber) {
				line += ` ${card.collectorNumber}`;
			}
		}

		lines.push(line);
	}

	return lines.join('\n');
}

/**
 * Validates a card name (basic sanitization)
 */
export function isValidCardName(name: string): boolean {
	return name.length > 0 && name.length <= 200;
}

/**
 * Validates a set code format
 */
export function isValidSetCode(setCode: string): boolean {
	// Set codes are typically 3-4 uppercase letters/numbers
	return /^[A-Z0-9]{2,5}$/i.test(setCode);
}

/**
 * Counts total cards in a deck
 */
export function countCards(cards: Card[]): number {
	return cards.reduce((sum, card) => sum + card.quantity, 0);
}

/**
 * Merges duplicate cards by name (combines quantities)
 */
export function mergeDuplicates(cards: Card[]): Card[] {
	const cardMap = new Map<string, Card>();

	for (const card of cards) {
		const key = `${card.name}|${card.setCode || ''}`;

		if (cardMap.has(key)) {
			const existing = cardMap.get(key)!;
			existing.quantity += card.quantity;
		} else {
			cardMap.set(key, { ...card });
		}
	}

	return Array.from(cardMap.values());
}
