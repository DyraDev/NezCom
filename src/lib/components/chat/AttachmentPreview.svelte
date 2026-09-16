<script lang="ts">
	import { FileText, Paperclip, X } from 'lucide-svelte';

	let { files = [], onRemove }: { files: File[]; onRemove: (index: number) => void } = $props();
</script>

{#if files.length > 0}
	<div class="flex gap-2 border-t border-[#DDE5E0] bg-[#F5F7F5] p-2.5 overflow-x-auto">
		{#each files as f, idx}
			<div class="flex items-center gap-2 rounded-lg border border-[#DDE5E0] bg-white p-2 text-xs font-semibold text-[#24313A] shadow-2xs">
				{#if f.type.startsWith('image/')}
					<Paperclip class="h-3.5 w-3.5 text-[#5F98A5] shrink-0" />
				{:else}
					<FileText class="h-3.5 w-3.5 text-[#5F98A5] shrink-0" />
				{/if}
				<span class="truncate max-w-35 text-[11px]">{f.name}</span>
				<button type="button" onclick={() => onRemove(idx)} class="rounded p-0.5 text-[#6F7B7B] hover:bg-[#EEF3F0] hover:text-[#C96F6F] cursor-pointer">
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		{/each}
	</div>
{/if}
