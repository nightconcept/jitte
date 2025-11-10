/**
 * Keyword detection utilities for MTG card text
 * Detects and provides definitions for Magic: The Gathering keyword abilities
 */

import keywordsData from '$lib/data/keywords.json';

export interface KeywordDefinition {
	name: string;
	definition: string;
	category: 'evergreen' | 'mechanic' | 'commander';
}

export interface KeywordMatch {
	keyword: string;
	definition: KeywordDefinition;
	startIndex: number;
	endIndex: number;
}

// Build a map for fast lookups
const keywordsMap = new Map<string, KeywordDefinition>(
	Object.entries(keywordsData.keywords).map(([key, value]) => [
		key.toLowerCase(),
		value as KeywordDefinition
	])
);

/**
 * Get all available keywords
 */
export function getAllKeywords(): Map<string, KeywordDefinition> {
	return keywordsMap;
}

/**
 * Get definition for a specific keyword
 */
export function getKeywordDefinition(keyword: string): KeywordDefinition | undefined {
	return keywordsMap.get(keyword.toLowerCase());
}

/**
 * Detect keywords in oracle text
 * Returns matches sorted by position in text
 */
export function detectKeywords(text: string): KeywordMatch[] {
	const matches: KeywordMatch[] = [];
	const textLower = text.toLowerCase();

	// Sort keywords by length (longest first) to match "double strike" before "strike"
	const sortedKeywords = Array.from(keywordsMap.entries()).sort(
		([a], [b]) => b.length - a.length
	);

	for (const [keyword, definition] of sortedKeywords) {
		// Create regex for word boundary matching
		// Use \b for word boundaries, but handle "first strike", "double strike", etc.
		const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
		let match: RegExpExecArray | null;

		while ((match = regex.exec(textLower)) !== null) {
			const startIndex = match.index;
			const endIndex = startIndex + keyword.length;

			// Check if this position is already matched by a longer keyword
			const isOverlapping = matches.some(
				(existing) =>
					(startIndex >= existing.startIndex && startIndex < existing.endIndex) ||
					(endIndex > existing.startIndex && endIndex <= existing.endIndex)
			);

			if (!isOverlapping) {
				matches.push({
					keyword: keyword,
					definition: definition,
					startIndex: startIndex,
					endIndex: endIndex
				});
			}
		}
	}

	// Sort matches by start position
	return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a specific keyword exists in text
 */
export function hasKeyword(text: string, keyword: string): boolean {
	const textLower = text.toLowerCase();
	const keywordLower = keyword.toLowerCase();
	const regex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'i');
	return regex.test(textLower);
}

/**
 * Extract just the keyword names from text (for filtering/searching)
 */
export function extractKeywordNames(text: string): string[] {
	const matches = detectKeywords(text);
	return [...new Set(matches.map((m) => m.definition.name))];
}
