/**
 * Tests for filename sanitization utilities
 */

import { describe, expect, it } from 'vitest';
import {
	extractDeckName,
	getDeckFilename,
	getVersionFilename,
	isValidFilename,
	makeUniqueDeckName,
	sanitizeDeckName
} from './filename';

describe('sanitizeDeckName', () => {
	it('should keep valid deck names unchanged', () => {
		expect(sanitizeDeckName('My Deck')).toBe('My Deck');
		expect(sanitizeDeckName('Gruul Aggro')).toBe('Gruul Aggro');
		expect(sanitizeDeckName('Commander-2023')).toBe('Commander-2023');
	});

	it('should remove illegal Windows characters', () => {
		expect(sanitizeDeckName('Deck<Name>')).toBe('Deck-Name-');
		expect(sanitizeDeckName('Deck:Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck|Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck?Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck*Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck/Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck\\Name')).toBe('Deck-Name');
		expect(sanitizeDeckName('Deck"Name')).toBe('Deck-Name');
	});

	it('should collapse multiple spaces', () => {
		expect(sanitizeDeckName('Deck    Name')).toBe('Deck Name');
		expect(sanitizeDeckName('Deck  Name  2023')).toBe('Deck Name 2023');
	});

	it('should trim whitespace', () => {
		expect(sanitizeDeckName('  Deck Name  ')).toBe('Deck Name');
		expect(sanitizeDeckName('Deck Name\t')).toBe('Deck Name');
	});

	it('should remove leading/trailing dots', () => {
		expect(sanitizeDeckName('.Deck Name.')).toBe('Deck Name');
		expect(sanitizeDeckName('...Deck...')).toBe('Deck');
	});

	it('should handle Windows reserved names', () => {
		expect(sanitizeDeckName('CON')).toBe('CON_deck');
		expect(sanitizeDeckName('PRN')).toBe('PRN_deck');
		expect(sanitizeDeckName('AUX')).toBe('AUX_deck');
		expect(sanitizeDeckName('NUL')).toBe('NUL_deck');
		expect(sanitizeDeckName('COM1')).toBe('COM1_deck');
		expect(sanitizeDeckName('LPT1')).toBe('LPT1_deck');
	});

	it('should truncate very long names', () => {
		const longName = 'a'.repeat(250);
		const result = sanitizeDeckName(longName);
		expect(result.length).toBeLessThanOrEqual(200);
	});

	it('should return default name for empty input', () => {
		expect(sanitizeDeckName('')).toBe('untitled-deck');
		expect(sanitizeDeckName('   ')).toBe('untitled-deck');
	});

	it('should use custom replacement character', () => {
		expect(sanitizeDeckName('Deck<Name>', '_')).toBe('Deck_Name_');
		expect(sanitizeDeckName('Deck:Name', ' ')).toBe('Deck Name');
	});
});

describe('getDeckFilename', () => {
	it('should add .zip extension', () => {
		expect(getDeckFilename('My Deck')).toBe('My Deck.zip');
		expect(getDeckFilename('Gruul Aggro')).toBe('Gruul Aggro.zip');
	});

	it('should sanitize name before adding extension', () => {
		expect(getDeckFilename('Deck<Name>')).toBe('Deck-Name-.zip');
	});
});

describe('getVersionFilename', () => {
	it('should format version correctly', () => {
		expect(getVersionFilename('1.0.0')).toBe('v1.0.0.txt');
		expect(getVersionFilename('2.5.13')).toBe('v2.5.13.txt');
	});

	it('should sanitize invalid characters', () => {
		expect(getVersionFilename('1.0.0<test>')).toBe('v1.0.0_test_.txt');
	});
});

describe('isValidFilename', () => {
	it('should validate normal filenames', () => {
		expect(isValidFilename('My Deck')).toBe(true);
		expect(isValidFilename('deck-2023')).toBe(true);
		expect(isValidFilename('Commander Deck.zip')).toBe(true);
	});

	it('should reject filenames with illegal characters', () => {
		expect(isValidFilename('Deck<Name>')).toBe(false);
		expect(isValidFilename('Deck:Name')).toBe(false);
		expect(isValidFilename('Deck|Name')).toBe(false);
	});

	it('should reject Windows reserved names', () => {
		expect(isValidFilename('CON')).toBe(false);
		expect(isValidFilename('PRN')).toBe(false);
		expect(isValidFilename('AUX.txt')).toBe(false);
	});

	it('should reject filenames with leading/trailing dots', () => {
		expect(isValidFilename('.filename')).toBe(false);
		expect(isValidFilename('filename.')).toBe(false);
	});

	it('should reject filenames that are too long', () => {
		const longName = 'a'.repeat(256);
		expect(isValidFilename(longName)).toBe(false);
	});

	it('should reject empty or null filenames', () => {
		expect(isValidFilename('')).toBe(false);
	});
});

describe('extractDeckName', () => {
	it('should extract name from .zip filename', () => {
		expect(extractDeckName('My Deck.zip')).toBe('My Deck');
		expect(extractDeckName('Gruul Aggro.zip')).toBe('Gruul Aggro');
	});

	it('should handle filenames without .zip extension', () => {
		expect(extractDeckName('My Deck')).toBe('My Deck');
	});

	it('should be case insensitive for extension', () => {
		expect(extractDeckName('My Deck.ZIP')).toBe('My Deck');
		expect(extractDeckName('My Deck.Zip')).toBe('My Deck');
	});
});

describe('makeUniqueDeckName', () => {
	it('should return original name if not in use', () => {
		const existing = new Set<string>();
		expect(makeUniqueDeckName('My Deck', existing)).toBe('My Deck');
	});

	it('should append number if name exists', () => {
		const existing = new Set(['My Deck']);
		expect(makeUniqueDeckName('My Deck', existing)).toBe('My Deck-1');
	});

	it('should increment number for multiple duplicates', () => {
		const existing = new Set(['My Deck', 'My Deck-1', 'My Deck-2']);
		expect(makeUniqueDeckName('My Deck', existing)).toBe('My Deck-3');
	});

	it('should sanitize name first', () => {
		const existing = new Set<string>();
		const result = makeUniqueDeckName('Deck<Name>', existing);
		expect(result).toBe('Deck-Name-');
	});
});
