<script lang="ts">
	import type { Card } from '$lib/types/card';
	import { detectPartnerType, formatPartnerType, getPartnerWithName } from '$lib/utils/partner-detection';

	let { card }: { card: Card } = $props();

	let partnerType = $derived(detectPartnerType(card));
	let partnerWithName = $derived(partnerType === 'partner_with' ? getPartnerWithName(card) : null);
	let displayText = $derived(() => {
		if (!partnerType) return null;

		if (partnerType === 'partner_with' && partnerWithName) {
			return `Partner with ${partnerWithName}`;
		}

		return formatPartnerType(partnerType);
	});

	// Color coding by partner type
	let badgeClass = $derived(() => {
		if (!partnerType) return '';

		switch (partnerType) {
			case 'partner':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
			case 'partner_with':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
			case 'friends_forever':
				return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
			case 'choose_background':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
			default:
				return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
		}
	});

	let tooltipText = $derived(() => {
		switch (partnerType) {
			case 'partner':
				return 'This commander has Partner and can pair with another commander that also has Partner.';
			case 'partner_with':
				return partnerWithName
					? `This commander can only partner with ${partnerWithName}.`
					: 'This commander has Partner With and can only partner with its specified pair.';
			case 'friends_forever':
				return 'This commander has Friends Forever and can pair with another commander that also has Friends Forever.';
			case 'choose_background':
				return 'This commander has Choose a Background and can pair with a legendary Background enchantment.';
			default:
				return '';
		}
	});
</script>

{#if partnerType && displayText()}
	<span
		class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border {badgeClass()}"
		title={tooltipText()}
	>
		<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
		</svg>
		{displayText()}
	</span>
{/if}
