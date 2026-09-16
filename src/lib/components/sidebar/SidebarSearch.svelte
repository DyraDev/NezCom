<script lang="ts">
	import { Search, X } from 'lucide-svelte';

	let { value = $bindable('') }: { value: string } = $props();
</script>

<div class="px-3.5 py-3">
	<div class="flex h-9 items-center gap-2 rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] px-3 text-[#6F7B7B] transition-all focus-within:border-[#5F98A5] focus-within:bg-white">
		<Search class="h-3.5 w-3.5 shrink-0 text-[#6F7B7B]" />
		<input
			type="text"
			bind:value
			placeholder="Cari chat, kelas, atau nama..."
			class="w-full bg-transparent text-xs text-[#24313A] placeholder-[#A5AEAA] border-0 outline-none"
		/>
		{#if value}
			<button type="button" onclick={() => (value = '')} class="text-[#A5AEAA] hover:text-[#24313A] cursor-pointer">
				<X class="h-3.5 w-3.5" />
			</button>
		{/if}
	</div>
</div>
