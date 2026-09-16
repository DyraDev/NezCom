<script lang="ts">
	import type { UserRecord } from '$lib/types';
	import { getAvatarUrl, currentUser } from '$lib/pocketbase';
	import { getInitials } from '$lib/formatters';
	import { Check } from 'lucide-svelte';

	let {
		user,
		isActive = false,
		onClick
	}: {
		user: UserRecord;
		isActive?: boolean;
		onClick?: () => void;
	} = $props();

	const initials = $derived(getInitials(user.name || user.username));
	const name = $derived(user.name || user.username);
	const isTypingToMe = $derived(user.typing_to === $currentUser?.id);
	const lastMsg = $derived(
		isTypingToMe
			? 'sedang mengetik...'
			: user.lastMessage || (user.role === 'teacher' ? 'Guru Sekolah' : 'Siswa ' + (user.class_name || ''))
	);
	const time = $derived(user.lastTime || '');
	const unread = $derived(user.unreadCount || 0);
	const isLastMsgFromMe = $derived(!isTypingToMe && user.lastMessageSenderId === $currentUser?.id);
	const hasRealMessage = $derived(!!user.lastMessage);

	const avatarColorClass = $derived(
		user.role === 'teacher' ? 'sage' : user.role === 'superadmin' ? 'dark' : 'blue'
	);
</script>

<button
	type="button"
	onclick={onClick}
	class="flex min-h-14.5 w-full items-center gap-2.5 rounded-lg p-2 text-left transition-all cursor-pointer mb-0.5 {isActive
		? 'bg-[#8FBBC5]/20 font-semibold'
		: 'hover:bg-[#EEF3F0]'}"
>
	<!-- Avatar with Online Dot -->
	<div class="relative shrink-0">
		{#if user.avatar}
			<img src={getAvatarUrl(user)} alt={name} class="h-9 w-9 rounded-full object-cover ring-1 ring-[#DDE5E0]" />
		{:else}
			<div class="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-[#24313A] {avatarColorClass === 'sage' ? 'bg-[#A9C8B3]' : avatarColorClass === 'dark' ? 'bg-[#D6DEE0]' : 'bg-[#8FBBC5]'}">
				{initials}
			</div>
		{/if}
		{#if user.online}
			<span class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#6F9A7C] ring-2 ring-white"></span>
		{:else}
			<span class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[#A5AEAA] ring-2 ring-white"></span>
		{/if}
	</div>

	<!-- Copy (Name, Time, Preview, Unread Badge) -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center justify-between gap-1 mb-0.5">
			<span class="truncate text-xs font-semibold text-[#24313A]">{name}</span>
			{#if time && !isTypingToMe}
				<span class="shrink-0 text-[10px] {unread > 0 ? 'text-[#5F98A5] font-bold' : 'text-[#A5AEAA]'}">{time}</span>
			{/if}
		</div>

		<div class="flex items-center justify-between gap-1.5">
			<span class="flex items-center gap-1 truncate text-[11px] min-w-0 {isTypingToMe ? 'text-[#6F9A7C] font-semibold italic' : 'text-[#6F7B7B]'}">
				{#if isLastMsgFromMe && hasRealMessage}
					<Check class="h-3 w-3 shrink-0 text-[#5F98A5]" />
				{/if}
				<span class="truncate">{lastMsg}</span>
			</span>
			{#if unread > 0 && !isTypingToMe}
				<span class="grid h-4.5 min-w-4.75 place-items-center rounded-full bg-[#5F98A5] px-1.5 text-[9px] font-bold text-white shrink-0">
					{unread}
				</span>
			{/if}
		</div>
	</div>
</button>
