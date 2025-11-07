<script lang="ts">
	export let vendor: 'cardkingdom' | 'tcgplayer' | 'manapool';
	export let size: number = 15;
</script>

{#if vendor === 'cardkingdom'}
	<svg
		focusable="false"
		height={size}
		width={size}
		style="vertical-align: -2px;"
		color="currentColor"
		aria-hidden="true"
		version="1.1"
		viewBox="0 0 3.7041667 3.1750001"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Card Kingdom</title>
		<g transform="translate(0 -293.82)">
			<path
				d="m0 293.82v1.1592h0.52042v2.0158h2.6633v-2.0158h0.52042v-1.1592h-0.57636v1.0908h-0.49196v-1.084h-0.54839v1.084h-0.47074v-1.084h-0.54839v1.084h-0.49196v-1.0908z"
				fill="currentColor"
			></path>
		</g>
	</svg>
{:else if vendor === 'tcgplayer'}
	<svg
		focusable="false"
		height={size}
		width={size}
		style="vertical-align: -2px;"
		color="currentColor"
		aria-hidden="true"
		viewBox="0 0 600 451"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>TCGplayer</title>
		<path
			fill="currentColor"
			stroke-width="0px"
			d="M115.9,44.1l-84.9,12.6C11.1,59.6-2.5,78,.4,97.7l42.4,283c3,19.7,21.4,33.3,41.3,30.4l31.8-4.7V44.1Z"
		></path>
		<path
			fill="currentColor"
			stroke-width="0px"
			d="M569,56.7l-83.8-12.4v362.3l30.7,4.6c19.8,2.9,38.3-10.7,41.3-30.4l42.4-283c3-19.7-10.7-38.1-30.6-41h0Z"
		></path>
		<path fill="currentColor" stroke-width="0px" d="M187.3,132.1h0s0,0,0,0Z"></path>
		<path fill="currentColor" stroke-width="0px" d="M187.3,132h0s0,0,0,0Z"></path>
		<path
			fill="currentColor"
			stroke-width="0px"
			fill-rule="evenodd"
			d="M175,4.1h251.2c20.1,0,36.3,16.2,36.3,36.1v370.3c0,20-16.3,36.1-36.3,36.1h-251.2c-20.1,0-36.3-16.2-36.3-36.1V40.2c0-20,16.3-36.1,36.3-36.1ZM327.6,183.9h76.3c7.3,0,11.6,8.2,7.5,14.2l-108.6,157.7c-5.1,7.3-16.6,3.8-16.6-5.1v-81.8h0c0,0-89,0-89,0-6.7,0-11.1-7-8.2-13l75-154c1.5-3.1,4.7-5.1,8.2-5.1h83.3c6.7,0,11.1,7,8.2,13l-36.1,74.1Z"
		></path>
	</svg>
{:else if vendor === 'manapool'}
	<svg
		focusable="false"
		height={size}
		width={size}
		style="vertical-align: -2px;"
		color="currentColor"
		aria-hidden="true"
		viewBox="0 0 45 52"
		xmlns="http://www.w3.org/2000/svg"
	>
		<title>Mana Pool</title>
		<path
			d="M26.8996 13.5618L0 20.9287V42.3115L26.8996 34.9734V13.5618ZM44.323 22.311L26.8996 13.5618V27.1726L44.323 22.311Z"
			fill="transparent"
		></path>
		<path
			d="M26.4867 35.3677V2.24316L3.67389 8.49143V41.616L26.4867 35.3677Z"
			fill="transparent"
		></path>
		<path
			d="M7.53473 43.59L30.3475 37.3417V4.21661L7.53473 10.4654V43.59Z"
			fill="transparent"
		></path>
		<path
			d="M11.3955 45.564L34.2083 39.3157V6.19061L11.3955 12.4389V45.564Z"
			fill="transparent"
		></path>
		<path
			d="M15.2563 47.5374L38.0691 41.2891V8.16461L15.2563 14.4129V47.5374Z"
			fill="transparent"
		></path>
		<path
			d="M41.93 43.2626V10.1392L19.1172 16.3874V49.512L41.93 43.2626Z"
			fill="transparent"
		></path>
		<path
			d="M17.4239 51.0613L0 42.3115V20.9298L17.4245 29.6785L17.4239 51.0613Z"
			fill="currentColor"
		></path>
		<path
			d="M17.4239 51.0613L0 42.3115V20.9298L17.4245 29.6785V30.2223L0.494489 21.7259L0.635771 41.9254L17.4239 50.4587V51.0613Z"
			fill="transparent"
		></path>
		<path
			d="M22.4531 28.301L17.4245 29.6785L17.4239 51.0613L44.3225 43.6938L44.323 22.311L39.0625 23.7521V35.7331L28.012 38.8274V43.1957L22.4531 44.6509V28.301Z"
			fill="currentColor"
		></path>
		<path
			d="M17.4239 50.4587V51.0613L44.3225 43.6938L44.323 22.311L43.9052 22.4274L43.9378 43.2675L17.4239 50.4587Z"
			fill="transparent"
		></path>
		<path
			d="M17.4245 29.6785L0 20.9298V7.16022L17.4245 15.9083V29.6785Z"
			fill="currentColor"
		></path>
		<path
			d="M44.323 8.54093L26.2139 0L0 7.16022L17.4239 15.9094L44.323 8.54093Z"
			fill="currentColor"
		></path>
		<path
			d="M44.323 8.54093L26.2139 0L26.2193 0.273532L43.3036 8.43652L17.424 15.5005L17.4245 15.9083L44.323 8.54093Z"
			fill="transparent"
		></path>
		<path
			d="M39.0625 23.7521L44.323 22.311L44.323 8.54093L17.4245 15.9083V29.6785L22.4531 28.301L22.4536 19.5268L30.7588 22.6102L39.0625 14.9774V23.7521Z"
			fill="currentColor"
		></path>
		<path d="M17.424 29.6331V30.1791L22.4531 28.8016V28.26L17.424 29.6331Z" fill="transparent"></path>
		<path
			d="M39.0625 23.7521L44.323 22.311L44.323 8.54093L43.8666 8.66658L43.897 21.9299L39.063 23.3133L39.0625 23.7521Z"
			fill="transparent"
		></path>
		<path
			d="M34.5322 31.871L27.2148 33.8755V30.0917L34.5322 28.0873V31.871Z"
			fill="currentColor"
		></path>
		<path d="M0.490685 21.1756L0 20.9298V7.16022L0.458081 7.3897L0.490685 21.1756Z" fill="transparent"></path>
		<path
			d="M0.842267 7.2369L26.2193 0.273532L26.2139 0L0 7.16022L17.4239 15.9094L17.424 15.5005L0.842267 7.2369Z"
			fill="transparent"
		></path>
	</svg>
{/if}
