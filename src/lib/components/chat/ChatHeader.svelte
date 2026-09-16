<script lang="ts">
	import type { ActiveTargetType } from '$lib/types';
	import { getAvatarUrl } from '$lib/pocketbase';
	import { getInitials } from '$lib/formatters';
	import { Megaphone, Users, Menu, Search, MoreVertical, X } from 'lucide-svelte';

	let {
		type,
		target,
		onOpenMobileSidebar,
		onToggleInfoPanel,
		onSearchChange
	}: {
		type: ActiveTargetType;
		target: any;
		onOpenMobileSidebar?: () => void;
		onToggleInfoPanel?: () => void;
		onSearchChange?: (query: string) => void;
	} = $props();

	let showSearch = $state(false);
	let searchQuery = $state('');
	let searchInputEl: HTMLInputElement | null = $state(null);

	const initials = $derived(getInitials(target?.name || target?.username));
	const title = $derived(type === 'broadcast' ? '📢 Pengumuman Sekolah' : target?.name || target?.username || 'Chat');
	const subtitle = $derived(
		type === 'broadcast'
			? 'Saluran Informasi Resmi Sekolah'
			: type === 'group'
				? target?.type === 'class' ? 'Grup Kelas Official' : 'Komunitas Sekolah'
				: target?.role === 'teacher'
					? 'Guru Sekolah'
					: target?.role === 'superadmin'
						? 'Administrator'
						: 'Siswa ' + (target?.class_name || '')
	);
	const isOnline = $derived(type === 'direct' && target?.online === true);

	$effect(() => {
		if (showSearch && searchInputEl) {
			searchInputEl.focus();
		}
	});

	function handleSearchInput(e: Event) {
		const q = (e.target as HTMLInputElement).value;
		searchQuery = q;
		onSearchChange?.(q);
	}

	function closeSearch() {
		showSearch = false;
		searchQuery = '';
		onSearchChange?.('');
	}
</script>

<header class="relative flex min-h-16 items-center justify-between border-b border-[#DDE5E0] bg-white px-5 shadow-xs">
	<div class="flex items-center gap-3 min-w-0 flex-1">
		<button
			type="button"
			onclick={onOpenMobileSidebar}
			class="grid h-9 w-9 place-items-center rounded-lg text-[#6F7B7B] hover:bg-[#EEF3F0] md:hidden cursor-pointer"
		>
			<Menu class="h-5 w-5" />
		</button>

		{#if type === 'broadcast'}
			<div class="grid h-9 w-9 place-items-center rounded-lg bg-[#E8D28D] text-[#24313A] shrink-0 font-bold shadow-xs">
				<Megaphone class="h-4 w-4" />
			</div>
		{:else if type === 'group'}
			{#if target?.avatar}
				<img src={getAvatarUrl(target)} alt={title} class="h-9 w-9 rounded-lg object-cover ring-1 ring-[#DDE5E0] shrink-0" />
			{:else}
				<div class="grid h-9 w-9 place-items-center rounded-lg bg-[#A9C8B3]/30 text-[#6F9A7C] shrink-0 font-bold">
					<Users class="h-4 w-4" />
				</div>
			{/if}
		{:else if target?.avatar}
			<div class="relative shrink-0">
				<img src={getAvatarUrl(target)} alt="Avatar" class="h-9 w-9 rounded-full object-cover ring-1 ring-[#DDE5E0]" />
				<span class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-white {isOnline ? 'bg-[#6F9A7C]' : 'bg-[#A5AEAA]'}"></span>
			</div>
		{:else}
			<div class="relative shrink-0">
				<div class="grid h-9 w-9 place-items-center rounded-full bg-[#8FBBC5] text-xs font-bold text-[#24313A]">
					{initials}
				</div>
				{#if type === 'direct'}
					<span class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ring-2 ring-white {isOnline ? 'bg-[#6F9A7C]' : 'bg-[#A5AEAA]'}"></span>
				{/if}
			</div>
		{/if}

		{#if showSearch}
			<div class="flex items-center flex-1 max-w-md bg-[#EEF3F0] rounded-xl px-3 py-1.5 gap-2">
				<Search class="h-4 w-4 text-[#6F7B7B] shrink-0" />
				<input
					bind:this={searchInputEl}
					type="text"
					placeholder="Cari pesan dalam percakapan..."
					value={searchQuery}
					oninput={handleSearchInput}
					class="w-full bg-transparent text-xs text-[#24313A] focus:outline-none"
				/>
				<button type="button" onclick={closeSearch} class="text-[#6F7B7B] hover:text-[#24313A] cursor-pointer">
					<X class="h-4 w-4" />
				</button>
			</div>
		{:else}
			<div class="min-w-0 flex-1">
				<h2 class="truncate font-['Manrope',sans-serif] text-sm font-bold text-[#24313A]">{title}</h2>
				<div class="flex items-center gap-1.5 text-[10px] text-[#6F7B7B]">
					{#if type === 'direct'}
						<span class="h-1.5 w-1.5 rounded-full {isOnline ? 'bg-[#6F9A7C]' : 'bg-[#A5AEAA]'}"></span>
						<span class="truncate">{isOnline ? 'Online' : 'Offline'} · {subtitle}</span>
					{:else}
						<span class="truncate">{subtitle}</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-1 shrink-0 relative">
		<button
			type="button"
			onclick={() => (showSearch = !showSearch)}
			title="Cari Pesan"
			class="grid h-8 w-8 place-items-center rounded-lg text-[#6F7B7B] hover:bg-[#EEF3F0] hover:text-[#24313A] cursor-pointer"
		>
			<Search class="h-4 w-4" />
		</button>

		<button
			type="button"
			onclick={onToggleInfoPanel}
			title="Info Percakapan"
			class="grid h-8 w-8 place-items-center rounded-lg text-[#6F7B7B] hover:bg-[#EEF3F0] hover:text-[#24313A] cursor-pointer"
		>
			<MoreVertical class="h-4 w-4" />
		</button>
	</div>
</header>
