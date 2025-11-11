<script lang="ts">
	/**
	 * Corner badge component with horizontal text
	 * Displays a triangle cutout in the top-left corner of card images
	 */
	let {
		size = 'normal',
		text = '',
		color = 'rgb(156, 163, 175)',
		textColor = 'rgb(31, 41, 55)',
		title = undefined
	}: {
		size?: 'small' | 'normal' | 'large';
		text?: string;
		color?: string;
		textColor?: string;
		title?: string;
	} = $props();

	const sizes = {
		small: { svgSize: 34, textSize: '11px', textX: 4, textY: 12 },
		normal: { svgSize: 40, textSize: '13px', textX: 4, textY: 14 },
		large: { svgSize: 48, textSize: '15px', textX: 5, textY: 16 }
	};

	const config = sizes[size];
</script>

<div class="absolute top-0 left-0 z-10 pointer-events-none" {title}>
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

		<!-- Badge Text (Horizontal) -->
		<text
			x={config.textX}
			y={config.textY}
			font-size={config.textSize}
			font-weight="normal"
			fill={textColor}
			style="text-shadow: 0 0 2px rgba(255, 255, 255, 0.5);"
		>
			{text}
		</text>
	</svg>
</div>
