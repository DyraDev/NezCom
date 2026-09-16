<script lang="ts">
	import type { GroupRecord } from '$lib/types';
	import { getAvatarUrl } from '$lib/pocketbase';
	import { Users } from 'lucide-svelte';

	let {
		group,
		isActive = false,
		unreadCount = 0,
		typingText = '',
		onClick
	}: {
		group: GroupRecord;
		isActive?: boolean;
		unreadCount?: number;
		typingText?: string;
		onClick?: () => void;
	} = $props();
</script>

<button
	type="button"
	onclick={onClick}
	class="flex min-h-11 w-full items-center gap-2.5 rounded-lg p-2 text-left transition cursor-pointer {isActive
		? 'bg-[#8FBBC5]/25 font-semibold text-[#24313A]'
		: 'text-[#24313A] hover:bg-[#EEF3F0]'}"
>
	{#if group.avatar}
		<img src={getAvatarUrl(group)} alt={group.name} class="h-7 w-7 rounded-lg object-cover shrink-0 ring-1 ring-[#DDE5E0]" />
	{:else}
		<div class="grid h-7 w-7 place-items-center rounded-lg bg-[#A9C8B3]/30 text-[#6F9A7C] shrink-0 font-bold text-xs">
			<Users class="h-3.5 w-3.5" />
		</div>
	{/if}

	<div class="min-w-0 flex-1">
		<strong class="block truncate text-xs font-semibold text-[#24313A]">{group.name}</strong>
		<span class="block truncate text-[10px] {typingText ? 'text-[#6F9A7C] font-semibold italic' : 'text-[#6F7B7B]'}">
			{typingText || (group.type === 'class' ? 'Grup Kelas' : 'Komunitas')}
		</span>
	</div>
	{#if unreadCount > 0 && !typingText}
		<span class="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-[#5F98A5] px-1.5 text-[9px] font-bold text-white">
			{unreadCount}
		</span>
	{/if}
</button>
