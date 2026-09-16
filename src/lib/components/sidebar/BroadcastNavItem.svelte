<script lang="ts">
	import { Megaphone } from 'lucide-svelte';

	let { isActive = false, unreadCount = 0, onClick }: { isActive?: boolean; unreadCount?: number; onClick?: () => void } = $props();
</script>

<button
	type="button"
	onclick={onClick}
	class="flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition cursor-pointer {isActive
		? 'border-[#D39A3E]/30 bg-[#E8D28D]/30 shadow-xs'
		: 'border-[#E8D28D]/20 bg-[#E8D28D]/15 hover:bg-[#E8D28D]/25'}"
>
	<div class="grid h-8 w-8 place-items-center rounded-lg bg-[#E8D28D] text-[#24313A] shrink-0 font-semibold shadow-xs">
		<Megaphone class="h-4 w-4" />
	</div>
	<div class="min-w-0 flex-1">
		<div class="truncate text-xs font-bold text-[#24313A]">📢 Pengumuman Sekolah</div>
		<div class="text-[10px] text-[#6F7B7B]">Saluran Informasi Resmi</div>
	</div>
	{#if unreadCount > 0}
		<span class="grid h-4 min-w-4 place-items-center rounded-full bg-[#E8D28D] px-1 text-[9px] font-bold text-[#24313A]">
			{unreadCount}
		</span>
	{/if}
</button>
