<script lang="ts">
	import { X, Check, ZoomIn, ZoomOut } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		imageFile = null,
		onCropComplete
	}: {
		isOpen: boolean;
		imageFile: File | null;
		onCropComplete: (croppedBlob: Blob) => void;
	} = $props();

	let canvas: HTMLCanvasElement | null = $state(null);
	let scale = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let startX = 0;
	let startY = 0;
	let imageObj: HTMLImageElement | null = $state(null);

	$effect(() => {
		if (isOpen && imageFile) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					imageObj = img;
					scale = 1;
					offsetX = 0;
					offsetY = 0;
					drawCanvas();
				};
				img.src = e.target?.result as string;
			};
			reader.readAsDataURL(imageFile);
		}
	});

	$effect(() => {
		if (imageObj && (scale || offsetX !== undefined || offsetY !== undefined)) {
			drawCanvas();
		}
	});

	function drawCanvas() {
		if (!canvas || !imageObj) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const size = 256;
		canvas.width = size;
		canvas.height = size;

		ctx.clearRect(0, 0, size, size);

		// Circular clipping mask
		ctx.beginPath();
		ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();

		// Draw background
		ctx.fillStyle = '#EEF3F0';
		ctx.fillRect(0, 0, size, size);

		// Calculate scaled image dimensions
		const minDim = Math.min(imageObj.width, imageObj.height);
		const baseScale = size / minDim;
		const finalScale = baseScale * scale;

		const drawW = imageObj.width * finalScale;
		const drawH = imageObj.height * finalScale;

		const x = (size - drawW) / 2 + offsetX;
		const y = (size - drawH) / 2 + offsetY;

		ctx.drawImage(imageObj, x, y, drawW, drawH);
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		startX = e.clientX - offsetX;
		startY = e.clientY - offsetY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		offsetX = e.clientX - startX;
		offsetY = e.clientY - startY;
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleSave() {
		if (!canvas) return;
		canvas.toBlob((blob) => {
			if (blob) {
				onCropComplete(blob);
				isOpen = false;
			}
		}, 'image/jpeg', 0.9);
	}
</script>

{#if isOpen && imageFile}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#24313A]/60 p-4 backdrop-blur-xs">
		<div class="w-full max-w-sm rounded-2xl border border-[#DDE5E0] bg-white p-5 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[#DDE5E0] pb-3">
				<h3 class="font-['Manrope',sans-serif] text-sm font-bold text-[#24313A]">Potong Foto Profil</h3>
				<button type="button" onclick={() => (isOpen = false)} class="rounded-lg p-1 text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer">
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Canvas Preview Area -->
			<div class="flex flex-col items-center justify-center space-y-3">
				<p class="text-[11px] text-[#6F7B7B]">Geser & atur ukuran foto sesuai lingkaran</p>
				
				<div
					class="relative cursor-move overflow-hidden rounded-full ring-4 ring-[#5F98A5]/30 shadow-inner"
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					role="button"
					tabindex="0"
				>
					<canvas bind:this={canvas} class="h-48 w-48 rounded-full touch-none"></canvas>
				</div>

				<!-- Zoom Controls -->
				<div class="flex items-center gap-3 pt-2">
					<button
						type="button"
						onclick={() => (scale = Math.max(0.5, scale - 0.1))}
						class="grid h-8 w-8 place-items-center rounded-lg border border-[#DDE5E0] text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer"
					>
						<ZoomOut class="h-4 w-4" />
					</button>
					<input
						type="range"
						min="0.5"
						max="3"
						step="0.05"
						bind:value={scale}
						class="w-32 accent-[#5F98A5] cursor-pointer"
					/>
					<button
						type="button"
						onclick={() => (scale = Math.min(3, scale + 0.1))}
						class="grid h-8 w-8 place-items-center rounded-lg border border-[#DDE5E0] text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer"
					>
						<ZoomIn class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					class="rounded-xl border border-[#DDE5E0] px-4 py-2 text-xs font-semibold text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={handleSave}
					class="flex items-center gap-1.5 rounded-xl bg-[#5F98A5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5F98A5]/90 cursor-pointer shadow-xs"
				>
					<Check class="h-4 w-4" />
					Simpan Foto
				</button>
			</div>
		</div>
	</div>
{/if}
