<script lang="ts">
	import { X, Download } from 'lucide-svelte';

	let {
		imageUrl,
		onClose
	}: {
		imageUrl: string | null;
		onClose?: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && imageUrl) {
			onClose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if imageUrl}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop Overlay Button -->
		<button
			type="button"
			onclick={onClose}
			class="fixed inset-0 bg-black/85 backdrop-blur-md transition-all duration-200 border-0 cursor-default"
			aria-label="Tutup Preview Gambar"
		></button>

		<!-- Control Bar -->
		<div class="absolute top-4 right-4 z-10 flex items-center gap-3">
			<a
				href={imageUrl}
				target="_blank"
				download
				title="Unduh Gambar"
				class="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
			>
				<Download class="h-5 w-5" />
			</a>
			<button
				type="button"
				onclick={onClose}
				title="Tutup (Esc)"
				class="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Image Container -->
		<div class="relative z-10 max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl shadow-2xl">
			<img
				src={imageUrl}
				alt="Preview"
				class="h-auto max-h-[85vh] w-auto max-w-[85vw] object-contain rounded-2xl"
			/>
		</div>
	</div>
{/if}
