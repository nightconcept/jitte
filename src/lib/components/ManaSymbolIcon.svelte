<script lang="ts">
	/**
	 * Card type icons using Mana Font
	 * https://mana.andrewgioia.com/
	 */

	let {
		type,
		size = 'md'
	}: {
		type: 'planeswalker' | 'creature' | 'instant' | 'sorcery' | 'artifact' | 'enchantment' | 'land';
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizeClasses = {
		sm: 'ms',
		md: 'ms',
		lg: 'ms'
	};

	const fontSizeClasses = {
		sm: 'text-sm',      // 14px
		md: 'text-base',    // 16px
		lg: 'text-lg'       // 18px
	};

	// Map card types to Mana Font classes
	const typeClassMap: Record<typeof type, string> = {
		planeswalker: 'ms-planeswalker',
		creature: 'ms-creature',
		instant: 'ms-instant',
		sorcery: 'ms-sorcery',
		artifact: 'ms-artifact',
		enchantment: 'ms-enchantment',
		land: 'ms-land'
	};

	const typeClass = $derived(typeClassMap[type]);
	const sizeClass = $derived(sizeClasses[size]);
	const fontSizeClass = $derived(fontSizeClasses[size]);
</script>

<i class="{sizeClass} {typeClass} {fontSizeClass}" title={type}></i>
