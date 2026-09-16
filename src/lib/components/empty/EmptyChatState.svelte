<script lang="ts">
	import { MessageSquare } from 'lucide-svelte';

	let { isGroup = false }: { isGroup?: boolean } = $props();
</script>

<div class="flex h-full flex-col items-center justify-center py-20 text-center text-[#6F7B7B]">
	<div class="grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3F0] text-[#5F98A5] mb-3">
		<MessageSquare class="h-6 w-6" />
	</div>
	<h3 class="font-['Manrope',sans-serif] text-base font-bold text-[#24313A]">
		{isGroup ? 'Belum ada pesan di grup ini' : 'Belum ada percakapan'}
	</h3>
	<p class="mt-1 max-w-xs text-xs text-[#6F7B7B]">
		{isGroup ? 'Jadilah orang pertama yang memulai percakapan.' : 'Mulai percakapan dengan siswa atau guru di sekolahmu.'}
	</p>
</div>
