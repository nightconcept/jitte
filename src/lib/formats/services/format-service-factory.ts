/**
 * Factory for creating format-specific services
 */

import type { FormatService } from './format-service';
import { DeckFormat } from '$lib/formats/format-registry';
import { CommanderFormatService } from './commander-service';
import { CubeFormatService } from './cube-service';

/**
 * Singleton instances of format services
 */
const services: Map<DeckFormat, FormatService> = new Map();

/**
 * Get the format service for a specific format
 * Uses singleton pattern to reuse service instances
 */
export function getFormatService(format: DeckFormat): FormatService {
	// Check if we already have an instance
	if (services.has(format)) {
		return services.get(format)!;
	}

	// Create new instance based on format
	let service: FormatService;

	switch (format) {
		case DeckFormat.Commander:
			service = new CommanderFormatService();
			break;

		case DeckFormat.Cube:
			service = new CubeFormatService();
			break;

		case DeckFormat.Standard:
		case DeckFormat.Modern:
			// Standard and Modern use same categorization as Commander
			// (type-based), but with different validation rules
			service = new CommanderFormatService();
			break;

		default:
			// Fallback to Commander service for unknown formats
			service = new CommanderFormatService();
			break;
	}

	// Cache the instance
	services.set(format, service);

	return service;
}

/**
 * Clear all cached service instances
 * Useful for testing
 */
export function clearServiceCache(): void {
	services.clear();
}
