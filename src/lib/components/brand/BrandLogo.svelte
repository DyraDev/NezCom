<script lang="ts">
	let { size = 'md' }: { size?: 'sm' | 'md' | 'lg' } = $props();
</script>

<div class="flex items-center gap-2.5">
	<div class="brand-symbol relative grid place-items-center rounded-xl bg-[#EEF3F0] overflow-hidden shadow-xs shrink-0 {size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'}">
		<img src="/favicon.png" alt="NezCom Logo" class="h-full w-full object-contain" />
	</div>
	<div class="font-['Manrope',sans-serif] font-extrabold tracking-tight text-[#24313A] {size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'}">
		Nez<span class="text-[#5F98A5]">Com</span>
	</div>
</div>
