/**
 * TypeScript interfaces for Scryfall API responses
 * Based on: https://scryfall.com/docs/api
 */

export type Color = 'W' | 'U' | 'B' | 'R' | 'G';

export type Legality = 'legal' | 'not_legal' | 'restricted' | 'banned';

export type Layout =
	| 'normal'
	| 'split'
	| 'flip'
	| 'transform'
	| 'modal_dfc'
	| 'meld'
	| 'leveler'
	| 'class'
	| 'saga'
	| 'adventure'
	| 'mutate'
	| 'prototype'
	| 'battle'
	| 'planar'
	| 'scheme'
	| 'vanguard'
	| 'token'
	| 'double_faced_token'
	| 'emblem'
	| 'augment'
	| 'host'
	| 'art_series'
	| 'reversible_card';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'special' | 'mythic' | 'bonus';

export type BorderColor = 'black' | 'white' | 'borderless' | 'silver' | 'gold';

export type FrameEffect =
	| 'legendary'
	| 'miracle'
	| 'nyxtouched'
	| 'draft'
	| 'devoid'
	| 'tombstone'
	| 'colorshifted'
	| 'inverted'
	| 'sunmoondfc'
	| 'compasslanddfc'
	| 'originpwdfc'
	| 'mooneldrazidfc'
	| 'waxingandwaningmoondfc'
	| 'showcase'
	| 'extendedart'
	| 'companion'
	| 'etched'
	| 'snow'
	| 'lesson'
	| 'shatteredglass'
	| 'convertdfc'
	| 'fandfc'
	| 'upsidedowndfc';

/**
 * Image URIs for different card image sizes
 */
export interface ScryfallImageUris {
	small: string; // 146x204
	normal: string; // 488x680
	large: string; // 672x936
	png: string; // Full-size PNG
	art_crop: string; // Cropped art only
	border_crop: string; // Card without border
}

/**
 * Price information for a card
 */
export interface ScryfallPrices {
	usd: string | null;
	usd_foil: string | null;
	usd_etched: string | null;
	eur: string | null;
	eur_foil: string | null;
	eur_etched: string | null;
	tix: string | null; // MTGO tickets
}

/**
 * Legality information across formats
 */
export interface ScryfallLegalities {
	standard: Legality;
	future: Legality;
	historic: Legality;
	timeless: Legality;
	gladiator: Legality;
	pioneer: Legality;
	explorer: Legality;
	modern: Legality;
	legacy: Legality;
	pauper: Legality;
	vintage: Legality;
	penny: Legality;
	commander: Legality;
	oathbreaker: Legality;
	standardbrawl: Legality;
	brawl: Legality;
	alchemy: Legality;
	paupercommander: Legality;
	duel: Legality;
	oldschool: Legality;
	premodern: Legality;
	predh: Legality;
}

/**
 * Related card object (tokens, meld parts, combo pieces)
 */
export interface ScryfallRelatedCard {
	id: string;
	object: 'related_card';
	component: 'token' | 'meld_part' | 'meld_result' | 'combo_piece';
	name: string;
	type_line: string;
	uri: string;
}

/**
 * Card face for multi-faced cards
 */
export interface ScryfallCardFace {
	artist?: string;
	artist_id?: string;
	cmc?: number;
	color_indicator?: Color[];
	colors?: Color[];
	defense?: string;
	flavor_text?: string;
	illustration_id?: string;
	image_uris?: ScryfallImageUris;
	layout?: Layout;
	loyalty?: string;
	mana_cost: string;
	name: string;
	object: 'card_face';
	oracle_id?: string;
	oracle_text?: string;
	power?: string;
	printed_name?: string;
	printed_text?: string;
	printed_type_line?: string;
	toughness?: string;
	type_line?: string;
	watermark?: string;
}

/**
 * Main Scryfall Card object
 */
export interface ScryfallCard {
	// Core fields
	id: string;
	object: 'card';
	oracle_id?: string;
	multiverse_ids?: number[];
	mtgo_id?: number;
	mtgo_foil_id?: number;
	tcgplayer_id?: number;
	tcgplayer_etched_id?: number;
	cardmarket_id?: number;
	arena_id?: number;
	name: string;
	lang: string;
	released_at: string;
	uri: string;
	scryfall_uri: string;
	layout: Layout;
	highres_image: boolean;
	image_status: 'missing' | 'placeholder' | 'lowres' | 'highres_scan';
	image_uris?: ScryfallImageUris;
	cmc: number;
	type_line: string;
	oracle_text?: string;
	mana_cost?: string;
	power?: string;
	toughness?: string;
	defense?: string;
	loyalty?: string;
	life_modifier?: string;
	hand_modifier?: string;
	colors?: Color[];
	color_indicator?: Color[];
	color_identity: Color[];
	keywords: string[];
	produced_mana?: Color[];

	// Multi-face cards
	all_parts?: ScryfallRelatedCard[];
	card_faces?: ScryfallCardFace[];

	// Legality and gameplay
	legalities: ScryfallLegalities;
	games: ('paper' | 'arena' | 'mtgo')[];
	reserved: boolean;
	edhrec_rank?: number;
	penny_rank?: number;

	// Print information
	set: string;
	set_name: string;
	set_type: string;
	set_id: string;
	set_uri: string;
	set_search_uri: string;
	scryfall_set_uri: string;
	rulings_uri: string;
	prints_search_uri: string;
	collector_number: string;
	digital: boolean;
	rarity: Rarity;
	artist?: string;
	artist_ids?: string[];
	illustration_id?: string;
	border_color: BorderColor;
	frame: string;
	frame_effects?: FrameEffect[];
	full_art: boolean;
	textless: boolean;
	booster: boolean;
	story_spotlight: boolean;
	promo: boolean;
	reprint: boolean;
	variation: boolean;

	// Flavor and extras
	flavor_name?: string;
	flavor_text?: string;
	watermark?: string;

	// Purchase and pricing
	prices: ScryfallPrices;
	related_uris: Record<string, string>;
	purchase_uris?: Record<string, string>;
}

/**
 * Scryfall List response (paginated)
 */
export interface ScryfallList<T> {
	object: 'list';
	total_cards?: number;
	has_more: boolean;
	next_page?: string;
	data: T[];
	warnings?: string[];
}

/**
 * Scryfall Catalog response (for autocomplete)
 */
export interface ScryfallCatalog {
	object: 'catalog';
	uri: string;
	total_values: number;
	data: string[];
}

/**
 * Scryfall Error response
 */
export interface ScryfallError {
	object: 'error';
	code: string;
	status: number;
	details: string;
	type?: string;
	warnings?: string[];
}

/**
 * Bulk data object
 */
export interface ScryfallBulkData {
	id: string;
	object: 'bulk_data';
	type: 'oracle_cards' | 'unique_artwork' | 'default_cards' | 'all_cards' | 'rulings';
	name: string;
	description: string;
	download_uri: string;
	updated_at: string;
	size: number;
	content_type: string;
	content_encoding: string;
}
