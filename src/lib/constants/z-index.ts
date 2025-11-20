/**
 * Centralized z-index constants for consistent layering across the application.
 *
 * Z-Index Hierarchy:
 * - Content layer (0-99): Base content, cards, inline elements
 * - Overlay layer (100-999): Context menus, dropdowns
 * - Modal layer (1000-9998): Full-screen modals, overlays, loading screens
 * - Tooltip layer (9999): Always visible tooltips
 */
export const Z_INDEX = {
	// Content layer (0-99)
	CARD_STACK: 1,              // Stacked cards in StacksView (DOM order handles visual stacking)
	CARD_STACK_ACTIVE: 20,      // Held/selected/hovered card
	DROPDOWN: 50,               // Inline dropdowns and form elements

	// Overlay layer (100-999)
	CONTEXT_MENU: 100,          // Right-click context menus

	// Modal layer (1000-9998)
	MODAL: 1000,                // Modals, full-screen overlays, loading screens

	// Tooltip layer (always on top)
	TOOLTIP: 9999,              // Tooltips must always be visible above everything
} as const;

export type ZIndex = typeof Z_INDEX[keyof typeof Z_INDEX];
