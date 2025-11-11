<script lang="ts">
	/**
	 * Generic triangle badge component
	 * Displays a triangle cutout in the top-left corner of card images
	 */
	let {
		size = 'normal',
		text = 'GC',
		color = 'rgb(245, 158, 11)',
		textColor = 'rgb(120, 53, 15)',
		title = undefined
	}: {
		size?: 'small' | 'normal' | 'large';
		text?: string;
		color?: string;
		textColor?: string;
		title?: string;
	} = $props();

	const sizes = {
		small: { svgSize: 40, textSize: '12px', textX: 9, textY: 17 },
		normal: { svgSize: 56, textSize: '16px', textX: 12, textY: 25 },
		large: { svgSize: 72, textSize: '20px', textX: 16, textY: 33 }
	};

	const config = sizes[size];
</script>

<div
	class="absolute top-0 left-0 z-10 pointer-events-none"
	{title}
>
	<svg
		width={config.svgSize}
		height={config.svgSize}
		viewBox="0 0 {config.svgSize} {config.svgSize}"
		xmlns="http://www.w3.org/2000/svg"
	>
		<!-- Triangle with rounded top corner (3mm MTG card corner radius) -->
		<path
			d="M 0,0 L {config.svgSize},0 L 0,{config.svgSize} Q 0,0 3,0 Z"
			fill={color}
			fill-opacity="1.0"
		/>

		<!-- Badge Text -->
		<text
			x={config.textX}
			y={config.textY}
			font-size={config.textSize}
			font-weight="bold"
			fill={textColor}
			transform="rotate(-45, {config.textX}, {config.textY})"
			style="text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);"
		>
			{text}
		</text>
	</svg>
</div>
