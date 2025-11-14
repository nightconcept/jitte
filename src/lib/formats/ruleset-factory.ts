/**
 * Ruleset factory - provides format-specific rulesets
 */

import type { FormatRuleset } from './ruleset';
import { DeckFormat } from './format-registry';
import { CommanderRuleset } from './rulesets/commander-ruleset';
import { StandardRuleset } from './rulesets/standard-ruleset';
import { ModernRuleset } from './rulesets/modern-ruleset';

export class RulesetFactory {
	private static rulesets = new Map<DeckFormat, FormatRuleset>([
		[DeckFormat.Commander, new CommanderRuleset()],
		[DeckFormat.Standard, new StandardRuleset()],
		[DeckFormat.Modern, new ModernRuleset()]
	]);

	/**
	 * Get the ruleset for a specific format
	 */
	static getRuleset(format: DeckFormat): FormatRuleset {
		const ruleset = this.rulesets.get(format);
		if (!ruleset) {
			throw new Error(`No ruleset found for format: ${format}`);
		}
		return ruleset;
	}

	/**
	 * Get all supported formats
	 */
	static getAllFormats(): DeckFormat[] {
		return Array.from(this.rulesets.keys());
	}
}
