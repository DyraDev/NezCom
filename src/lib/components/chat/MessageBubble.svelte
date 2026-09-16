<script lang="ts">
	import type { MessageRecord, UserRecord } from '$lib/types';
	import { formatTime, isImageFile, getInitials } from '$lib/formatters';
	import { getAvatarUrl, getFileUrl, currentUser } from '$lib/pocketbase';
	import { Check, CheckCheck, FileText, Download, Reply, Trash2, MessageSquare, Copy, Pin } from 'lucide-svelte';

	let {
		msg,
		showSender = false,
		isTargetOnline = false,
		onReply,
		onDelete,
		onSelectUser,
		onPreviewImage,
		onPinMessage
	}: {
		msg: MessageRecord;
		showSender?: boolean;
		isTargetOnline?: boolean;
		onReply?: (msg: MessageRecord) => void;
		onDelete?: (msg: MessageRecord) => void;
		onSelectUser?: (user: UserRecord) => void;
		onPreviewImage?: (url: string) => void;
		onPinMessage?: (msg: MessageRecord) => void;
	} = $props();

	const isMe = $derived(msg.sender === $currentUser?.id || msg.expand?.sender?.id === $currentUser?.id);
	const sender = $derived(msg.expand?.sender);
	const senderName = $derived(sender?.name || sender?.username || 'Siswa');
	const senderRole = $derived(sender?.role || 'student');
	const initials = $derived(getInitials(senderName));

	let showActions = $state(false);
	let isCopied = $state(false);

	function handleSenderClick() {
		if (!isMe && sender && onSelectUser) {
			onSelectUser(sender as unknown as UserRecord);
		}
	}

	async function handleCopyText() {
		if (!msg.content) return;
		try {
			await navigator.clipboard.writeText(msg.content);
			isCopied = true;
			setTimeout(() => {
				isCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy text:', err);
		}
	}

	function getFileExt(filename: string): string {
		const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
		return ext.length > 5 ? 'FILE' : ext;
	}

	function getExtBadgeColor(ext: string, isMe: boolean): string {
		if (isMe) return 'bg-white/20 text-white border-white/30';
		switch (ext) {
			case 'PDF':
				return 'bg-red-50 text-red-600 border-red-200';
			case 'DOC':
			case 'DOCX':
				return 'bg-blue-50 text-blue-600 border-blue-200';
			case 'XLS':
			case 'XLSX':
				return 'bg-emerald-50 text-emerald-600 border-emerald-200';
			case 'ZIP':
			case 'RAR':
				return 'bg-amber-50 text-amber-600 border-amber-200';
			default:
				return 'bg-[#EEF3F0] text-[#5F98A5] border-[#DDE5E0]';
		}
	}
	function isAudioFile(filename: string): boolean {
		const ext = filename.split('.').pop()?.toLowerCase();
		return ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'opus'].includes(ext || '');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	id="msg-{msg.id}"
	class="group my-2 flex w-full gap-2.5 {isMe ? 'flex-row-reverse' : 'flex-row'}"
	onmouseenter={() => (showActions = true)}
	onmouseleave={() => (showActions = false)}
>
	{#if !isMe}
		<button
			type="button"
			onclick={handleSenderClick}
			title={showSender ? `Chat 1:1 dengan ${senderName}` : undefined}
			class="shrink-0 self-end mb-0.5 cursor-pointer group/avatar"
		>
			{#if sender?.avatar}
				<img src={getAvatarUrl(sender)} alt={senderName} class="h-7 w-7 rounded-full object-cover ring-1 ring-[#DDE5E0] group-hover/avatar:ring-[#5F98A5] transition" />
			{:else}
				<div class="grid h-7 w-7 place-items-center rounded-full bg-[#8FBBC5] text-[10px] font-bold text-[#24313A] group-hover/avatar:bg-[#5F98A5] group-hover/avatar:text-white transition">
					{initials}
				</div>
			{/if}
		</button>
	{/if}

	<div class="flex max-w-[78%] flex-col {isMe ? 'items-end' : 'items-start'}">
		{#if !isMe && showSender}
			<div class="mb-1 flex items-center gap-1.5 px-1 text-[11px]">
				<button
					type="button"
					onclick={handleSenderClick}
					title={`Chat 1:1 dengan ${senderName}`}
					class="font-bold text-[#24313A] hover:text-[#5F98A5] hover:underline cursor-pointer flex items-center gap-1"
				>
					<span>{senderName}</span>
					<MessageSquare class="h-3 w-3 text-[#5F98A5] opacity-0 group-hover:opacity-100 transition" />
				</button>
				{#if senderRole === 'superadmin'}
					<span class="rounded bg-[#5F98A5]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#5F98A5]">Admin</span>
				{:else if senderRole === 'teacher'}
					<span class="rounded bg-[#6F9A7C]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#6F9A7C]">Guru</span>
				{:else if sender?.class_name}
					<span class="text-[10px] text-[#6F7B7B]">&bull; {sender.class_name}</span>
				{/if}
			</div>
		{/if}

		<!-- Bubble Container -->
		<div class="relative">
			<div
				class="rounded-[14px] px-3.5 py-2 text-xs sm:text-sm shadow-2xs transition-all {isMe
					? 'bg-[#5F98A5] text-white rounded-br-xs'
					: 'bg-white text-[#24313A] border border-[#DDE5E0] rounded-bl-xs'}"
			>
				<!-- Reply Preview -->
				{#if msg.replyPreview}
					<div class="mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-[11px] {isMe ? 'border-white/50 bg-white/15' : 'border-[#5F98A5] bg-[#EEF3F0]'}">
						<div class="font-bold {isMe ? 'text-white/90' : 'text-[#5F98A5]'}">{msg.replyPreview.senderName}</div>
						<div class="truncate {isMe ? 'text-white/70' : 'text-[#6F7B7B]'}">{msg.replyPreview.content}</div>
					</div>
				{/if}

				<!-- Attachments -->
				{#if msg.attachments && msg.attachments.length > 0}
					<div class="mb-1.5 space-y-1.5">
						{#each msg.attachments as att}
							{#if isImageFile(att)}
								<button
									type="button"
									onclick={() => onPreviewImage?.(getFileUrl(msg, att))}
									class="block overflow-hidden rounded-lg cursor-pointer text-left w-full group/img"
								>
									<img src={getFileUrl(msg, att)} alt="Attachment" class="max-h-56 w-full object-cover transition group-hover/img:scale-102" />
								</button>
							{:else if isAudioFile(att)}
								<div class="my-1 rounded-lg p-1.5 border {isMe ? 'bg-white/15 border-white/20' : 'bg-[#EEF3F0] border-[#DDE5E0]'}">
									<audio controls src={getFileUrl(msg, att)} class="w-full h-8 rounded max-w-xs focus:outline-none"></audio>
								</div>
							{:else}
								{@const ext = getFileExt(att)}
								<a
									href={getFileUrl(msg, att)}
									target="_blank"
									download
									class="flex items-center gap-2 rounded-lg p-2 text-xs font-semibold border transition {isMe
										? 'bg-white/15 border-white/20 text-white hover:bg-white/25'
										: 'bg-[#F5F7F5] border-[#DDE5E0] text-[#24313A] hover:bg-[#EEF3F0]'}"
								>
									<span class="rounded px-1.5 py-0.5 text-[9px] font-black border uppercase shrink-0 {getExtBadgeColor(ext, isMe)}">
										{ext}
									</span>
									<span class="truncate max-w-40">{att}</span>
									<Download class="h-3.5 w-3.5 ml-auto opacity-70 shrink-0" />
								</a>
							{/if}
						{/each}
					</div>
				{/if}

				{#if msg.content}
					<p class="whitespace-pre-wrap leading-relaxed wrap-break-word font-normal">{msg.content}</p>
				{/if}

				<div class="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
					<span>{formatTime(msg.created)}</span>
					{#if isMe}
						{#if msg.read_at}
							<span title="Dibaca"><CheckCheck class="h-3.5 w-3.5 text-[#34B7F1]" /></span>
						{:else if isTargetOnline}
							<span title="Tersampaikan (Penerima Online)"><CheckCheck class="h-3.5 w-3.5 text-white/80" /></span>
						{:else}
							<span title="Terkirim (Penerima Offline)"><Check class="h-3.5 w-3.5 text-white/80" /></span>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Copy Toast Notification -->
			{#if isCopied}
				<div class="absolute -top-7 left-1/2 -translate-x-1/2 z-20 rounded-md bg-[#24313A] px-2 py-0.5 text-[10px] font-semibold text-white shadow-md animate-fade-in">
					Tersalin!
				</div>
			{/if}

			<!-- Hover Action Buttons -->
			{#if showActions}
				<div class="absolute top-0 flex gap-0.5 {isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'}">
					{#if msg.content}
						<button
							type="button"
							onclick={handleCopyText}
							title="Salin Teks"
							class="grid h-6 w-6 place-items-center rounded-md bg-white border border-[#DDE5E0] text-[#6F7B7B] hover:text-[#5F98A5] hover:border-[#5F98A5] cursor-pointer transition shadow-xs"
						>
							<Copy class="h-3 w-3" />
						</button>
					{/if}

					<button
						type="button"
						onclick={() => onReply?.(msg)}
						title="Balas"
						class="grid h-6 w-6 place-items-center rounded-md bg-white border border-[#DDE5E0] text-[#6F7B7B] hover:text-[#5F98A5] hover:border-[#5F98A5] cursor-pointer transition shadow-xs"
					>
						<Reply class="h-3 w-3" />
					</button>

					{#if onPinMessage}
						<button
							type="button"
							onclick={() => onPinMessage?.(msg)}
							title="Sematkan Pesan"
							class="grid h-6 w-6 place-items-center rounded-md bg-white border border-[#DDE5E0] text-[#6F7B7B] hover:text-[#E8D28D] hover:border-[#E8D28D] cursor-pointer transition shadow-xs"
						>
							<Pin class="h-3 w-3" />
						</button>
					{/if}

					{#if isMe}
						<button
							type="button"
							onclick={() => onDelete?.(msg)}
							title="Hapus"
							class="grid h-6 w-6 place-items-center rounded-md bg-white border border-[#DDE5E0] text-[#6F7B7B] hover:text-[#C96F6F] hover:border-[#C96F6F] cursor-pointer transition shadow-xs"
						>
							<Trash2 class="h-3 w-3" />
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
