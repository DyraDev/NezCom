<script lang="ts">
	import type { MessageRecord } from '$lib/types';
	import { formatTime, formatDateHeader, isImageFile } from '$lib/formatters';
	import { getFileUrl } from '$lib/pocketbase';
	import { Megaphone, FileText, Download } from 'lucide-svelte';

	let { msg }: { msg: MessageRecord } = $props();

	const sender = $derived(msg.expand?.sender);
	const senderName = $derived(sender?.name || sender?.username || 'Sekolah');
</script>

<div class="my-3.5 mx-auto max-w-xl rounded-xl border border-[#D39A3E]/20 bg-[#E8D28D]/20 p-4 shadow-xs">
	<div class="flex items-center gap-2 mb-2 text-[#24313A]">
		<div class="grid h-6 w-6 place-items-center rounded-md bg-[#E8D28D] text-[#24313A] shrink-0 font-bold">
			<Megaphone class="h-3.5 w-3.5" />
		</div>
		<span class="text-xs font-bold uppercase tracking-wider text-[#24313A]">📢 PENGUMUMAN RESMI</span>
	</div>

	{#if msg.content}
		<p class="whitespace-pre-wrap text-sm text-[#24313A] leading-relaxed font-medium mb-3">{msg.content}</p>
	{/if}

	{#if msg.attachments && msg.attachments.length > 0}
		<div class="mb-3 space-y-2">
			{#each msg.attachments as att}
				{#if isImageFile(att)}
					<a href={getFileUrl(msg, att)} target="_blank" rel="noreferrer" class="block overflow-hidden rounded-lg border border-[#DDE5E0]">
						<img src={getFileUrl(msg, att)} alt="Attachment" class="max-h-64 w-full object-cover transition hover:scale-102" />
					</a>
				{:else}
					<a
						href={getFileUrl(msg, att)}
						target="_blank"
						download
						class="flex items-center gap-2 rounded-lg bg-white/80 p-2 text-xs font-semibold text-[#24313A] border border-[#DDE5E0] hover:bg-white"
					>
						<FileText class="h-4 w-4 text-[#5F98A5] shrink-0" />
						<span class="truncate flex-1">{att}</span>
						<Download class="h-3.5 w-3.5 text-[#6F7B7B]" />
					</a>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="flex items-center justify-between text-[11px] text-[#6F7B7B] pt-2 border-t border-[#D39A3E]/20">
		<span class="font-semibold text-[#24313A]">{senderName}</span>
		<span>{formatDateHeader(msg.created)} &bull; {formatTime(msg.created)}</span>
	</div>
</div>
