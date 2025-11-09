<script lang="ts">
	let { isLoading = false, message = 'Loading...' }: { isLoading?: boolean; message?: string } = $props();
</script>

{#if isLoading}
	<div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]">
		<div class="text-center">
			<!-- Spinner -->
			<div class="relative w-24 h-24 mx-auto mb-6">
				<!-- Outer ring -->
				<div class="absolute inset-0 border-4 border-[var(--color-brand-primary)]/30 rounded-full"></div>
				<!-- Spinning ring -->
				<div class="absolute inset-0 border-4 border-transparent border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
				<!-- Inner ring -->
				<div class="absolute inset-3 border-4 border-transparent border-t-[var(--color-accent-purple)] rounded-full animate-spin-slow"></div>
			</div>

			<!-- Message -->
			<p class="text-lg font-medium text-white mb-2">{message}</p>
			<p class="text-sm text-gray-300">Please wait...</p>
		</div>
	</div>
{/if}

<style>
	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin-slow {
		animation: spin-slow 2s linear infinite;
	}
</style>
