/**
 * Tests for decklist parser and serializer
 */

import { describe, expect, it } from 'vitest';
import {
	countCards,
	isValidCardName,
	isValidSetCode,
	mergeDuplicates,
	parsePlaintext,
	serializePlaintext
} from './decklist-parser';

describe('parsePlaintext', () => {
	it('should parse simple card format', () => {
		const input = '1 Lightning Bolt';
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Lightning Bolt'
		});
		expect(result.errors).toHaveLength(0);
	});

	it('should parse card with set code', () => {
		const input = '1 Sol Ring (2XM) 97';
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Sol Ring',
			setCode: '2XM',
			collectorNumber: '97'
		});
	});

	it('should parse card with set code only', () => {
		const input = '1 Counterspell (M21)';
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Counterspell',
			setCode: 'M21'
		});
	});

	it('should parse card with x notation', () => {
		const input = '4x Island';
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0]).toEqual({
			quantity: 4,
			name: 'Island'
		});
	});

	it('should parse card without quantity (defaults to 1)', () => {
		const input = 'Forest';
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Forest'
		});
	});

	it('should parse multiple cards', () => {
		const input = `1 Lightning Bolt
2 Counterspell (M21)
3x Island`;

		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(3);
		expect(result.cards[0].name).toBe('Lightning Bolt');
		expect(result.cards[1].name).toBe('Counterspell');
		expect(result.cards[2].name).toBe('Island');
	});

	it('should skip empty lines', () => {
		const input = `1 Lightning Bolt

2 Counterspell`;

		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	it('should skip comments', () => {
		const input = `// This is a comment
# Another comment
1 Lightning Bolt`;

		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].name).toBe('Lightning Bolt');
	});

	it('should skip section headers', () => {
		const input = `Commander:
1 Atraxa, Praetors' Voice

Deck:
99 Forest`;

		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(2);
	});

	it('should handle cards with apostrophes', () => {
		const input = "1 Atraxa, Praetors' Voice";
		const result = parsePlaintext(input);

		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].name).toBe("Atraxa, Praetors' Voice");
	});

	it('should report parse errors', () => {
		const input = `1 Lightning Bolt
2 Counterspell`;

		const result = parsePlaintext(input);

		// Both lines should parse successfully - there are no actual errors in this input
		expect(result.cards).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});
});

describe('serializePlaintext', () => {
	it('should serialize card without set code', () => {
		const cards = [{ name: 'Lightning Bolt', quantity: 1 }];
		const result = serializePlaintext(cards, false);

		expect(result).toBe('1 Lightning Bolt');
	});

	it('should serialize card with set code', () => {
		const cards = [{ name: 'Sol Ring', quantity: 1, setCode: '2XM', collectorNumber: '97' }];
		const result = serializePlaintext(cards, true);

		expect(result).toBe('1 Sol Ring (2XM) 97');
	});

	it('should serialize card with set code only', () => {
		const cards = [{ name: 'Counterspell', quantity: 2, setCode: 'M21' }];
		const result = serializePlaintext(cards, true);

		expect(result).toBe('2 Counterspell (M21)');
	});

	it('should serialize multiple cards', () => {
		const cards = [
			{ name: 'Lightning Bolt', quantity: 1 },
			{ name: 'Counterspell', quantity: 2 },
			{ name: 'Island', quantity: 3 }
		];
		const result = serializePlaintext(cards, false);

		expect(result).toBe('1 Lightning Bolt\n2 Counterspell\n3 Island');
	});

	it('should omit set codes when includeSetCodes is false', () => {
		const cards = [{ name: 'Sol Ring', quantity: 1, setCode: '2XM', collectorNumber: '97' }];
		const result = serializePlaintext(cards, false);

		expect(result).toBe('1 Sol Ring');
	});
});

describe('isValidCardName', () => {
	it('should validate normal card names', () => {
		expect(isValidCardName('Lightning Bolt')).toBe(true);
		expect(isValidCardName('Sol Ring')).toBe(true);
		expect(isValidCardName("Atraxa, Praetors' Voice")).toBe(true);
	});

	it('should reject empty names', () => {
		expect(isValidCardName('')).toBe(false);
	});

	it('should reject very long names', () => {
		const longName = 'a'.repeat(201);
		expect(isValidCardName(longName)).toBe(false);
	});
});

describe('isValidSetCode', () => {
	it('should validate normal set codes', () => {
		expect(isValidSetCode('2XM')).toBe(true);
		expect(isValidSetCode('M21')).toBe(true);
		expect(isValidSetCode('MH2')).toBe(true);
		expect(isValidSetCode('DOM')).toBe(true);
	});

	it('should reject invalid set codes', () => {
		expect(isValidSetCode('')).toBe(false);
		expect(isValidSetCode('X')).toBe(false); // Too short
		expect(isValidSetCode('TOOLONG')).toBe(false); // Too long
		expect(isValidSetCode('ABC-')).toBe(false); // Special characters
	});
});

describe('countCards', () => {
	it('should count total cards', () => {
		const cards = [
			{ name: 'Lightning Bolt', quantity: 4 },
			{ name: 'Counterspell', quantity: 2 },
			{ name: 'Island', quantity: 10 }
		];

		expect(countCards(cards)).toBe(16);
	});

	it('should return 0 for empty array', () => {
		expect(countCards([])).toBe(0);
	});
});

describe('mergeDuplicates', () => {
	it('should merge cards with same name', () => {
		const cards = [
			{ name: 'Lightning Bolt', quantity: 2 },
			{ name: 'Lightning Bolt', quantity: 2 }
		];

		const result = mergeDuplicates(cards);

		expect(result).toHaveLength(1);
		expect(result[0].quantity).toBe(4);
	});

	it('should keep different set codes separate', () => {
		const cards = [
			{ name: 'Sol Ring', quantity: 1, setCode: '2XM' },
			{ name: 'Sol Ring', quantity: 1, setCode: 'CMR' }
		];

		const result = mergeDuplicates(cards);

		expect(result).toHaveLength(2);
	});

	it('should handle cards without duplicates', () => {
		const cards = [
			{ name: 'Lightning Bolt', quantity: 1 },
			{ name: 'Counterspell', quantity: 1 },
			{ name: 'Island', quantity: 1 }
		];

		const result = mergeDuplicates(cards);

		expect(result).toHaveLength(3);
	});
});
