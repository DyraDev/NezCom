<script lang="ts">
	import AttachmentPreview from './AttachmentPreview.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { Paperclip, Send, Lock, Smile, X } from 'lucide-svelte';
	import type { MessageRecord } from '$lib/types';

	let {
		canSend = true,
		isSending = false,
		disabledReason = '',
		replyTo = null,
		onSend,
		onTyping,
		onCancelReply
	}: {
		canSend?: boolean;
		isSending?: boolean;
		disabledReason?: string;
		replyTo?: MessageRecord | null;
		onSend: (text: string, files: File[]) => Promise<void>;
		onTyping?: () => void;
		onCancelReply?: () => void;
	} = $props();

	let text = $state('');
	let selectedFiles = $state<File[]>([]);
	let showEmoji = $state(false);
	let inputEl = $state<HTMLTextAreaElement | null>(null);

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			selectedFiles = [...selectedFiles, ...Array.from(input.files)];
		}
	}

	function removeFile(index: number) {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	}

	function handleEmojiSelect(emoji: string) {
		text += emoji;
		showEmoji = false;
		inputEl?.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		const files: File[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.kind === 'file') {
				const blob = item.getAsFile();
				if (blob) {
					const filename = blob.name && blob.name !== 'image.png' ? blob.name : `pasted_image_${Date.now()}.png`;
					const file = new File([blob], filename, { type: blob.type });
					files.push(file);
				}
			}
		}
		if (files.length > 0) {
			selectedFiles = [...selectedFiles, ...files];
		}
	}

	function handleInput() {
		if (onTyping) onTyping();
	}

	async function handleSubmit(e?: Event) {
		if (e) e.preventDefault();
		if ((!text.trim() && selectedFiles.length === 0) || !canSend || isSending) return;

		const currentText = text.trim();
		const currentFiles = [...selectedFiles];

		text = '';
		selectedFiles = [];
		showEmoji = false;

		await onSend(currentText, currentFiles);
	}
</script>

<div class="border-t border-[#DDE5E0] bg-white shrink-0 sticky bottom-0 z-30 shadow-md sm:shadow-none">
	{#if !canSend}
		<div class="flex items-center justify-center gap-2 bg-[#F5F7F5] p-3 text-xs font-semibold text-[#6F7B7B]">
			<Lock class="h-4 w-4 text-[#D39A3E]" />
			{disabledReason || 'Hanya pengirim berwenang yang dapat mengirim pesan.'}
		</div>
	{:else}
		<!-- Reply Preview Bar -->
		{#if replyTo}
			<div class="flex items-center justify-between gap-2 border-b border-[#DDE5E0] bg-[#EEF3F0] px-4 py-2">
				<div class="min-w-0 flex-1">
					<div class="text-[10px] font-bold text-[#5F98A5]">
						Membalas {replyTo.expand?.sender?.name || replyTo.expand?.sender?.username || 'Pesan'}
					</div>
					<div class="truncate text-[11px] text-[#6F7B7B]">
						{replyTo.content || (replyTo.attachments?.length ? '📷 [Lampiran]' : '')}
					</div>
				</div>
				<button
					type="button"
					onclick={() => onCancelReply?.()}
					class="grid h-6 w-6 place-items-center rounded-md text-[#6F7B7B] hover:bg-[#DDE5E0] cursor-pointer"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		{/if}

		<AttachmentPreview files={selectedFiles} onRemove={removeFile} />

		<form onsubmit={handleSubmit} class="flex items-end gap-2 p-3">
			<label
				title="Lampirkan foto atau dokumen"
				class="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] text-[#6F7B7B] transition hover:bg-[#EEF3F0] hover:text-[#24313A] shrink-0 self-end"
			>
				<Paperclip class="h-4 w-4" />
				<input type="file" multiple onchange={handleFileChange} class="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
			</label>

			<div class="relative flex-1">
				{#if showEmoji}
					<EmojiPicker onSelect={handleEmojiSelect} />
				{/if}
				<textarea
					bind:this={inputEl}
					bind:value={text}
					oninput={handleInput}
					onkeydown={handleKeydown}
					onpaste={handlePaste}
					placeholder="Tulis pesan..."
					rows="1"
					class="w-full resize-none rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] px-3.5 py-2 pr-10 text-xs sm:text-sm text-[#24313A] placeholder-[#A5AEAA] outline-none transition focus:border-[#5F98A5] focus:bg-white max-h-24 overflow-y-auto"
				></textarea>
				<button
					type="button"
					onclick={() => (showEmoji = !showEmoji)}
					class="absolute right-2 bottom-2 grid h-6 w-6 place-items-center rounded-md text-[#6F7B7B] hover:text-[#5F98A5] cursor-pointer"
				>
					<Smile class="h-4 w-4" />
				</button>
			</div>

			<button
				type="submit"
				disabled={isSending || (!text.trim() && selectedFiles.length === 0)}
				class="grid h-9 w-9 place-items-center rounded-lg bg-[#5F98A5] text-white shadow-xs transition hover:bg-[#5F98A5]/90 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 self-end"
			>
				<Send class="h-4 w-4" />
			</button>
		</form>

		<div class="px-4 pb-1.5 text-[9px] text-[#A5AEAA]">
			Enter untuk kirim · Shift + Enter untuk baris baru
		</div>
	{/if}
</div>
