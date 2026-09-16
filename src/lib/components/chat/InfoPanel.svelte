<script lang="ts">
	import type { UserRecord, GroupRecord, MessageRecord, ActiveTargetType } from '$lib/types';
	import { getAvatarUrl, pb, currentUser } from '$lib/pocketbase';
	import { getInitials, isImageFile } from '$lib/formatters';
	import { X, Image, Users, AlertTriangle, MessageSquare, Camera, Trash2 } from 'lucide-svelte';
	import CropAvatarModal from '$lib/components/modals/CropAvatarModal.svelte';

	let {
		type,
		target,
		messages = [],
		onClose,
		onSelectUser,
		onGroupDeleted,
		onPreviewImage
	}: {
		type: ActiveTargetType;
		target: any;
		messages?: MessageRecord[];
		onClose?: () => void;
		onSelectUser?: (user: UserRecord) => void;
		onGroupDeleted?: () => void;
		onPreviewImage?: (url: string) => void;
	} = $props();

	let groupMembers = $state<UserRecord[]>([]);
	let memberSearchQuery = $state('');
	let isLoadingMembers = $state(false);

	// Avatar & Group Admin State
	let avatarInput: HTMLInputElement | null = $state(null);
	let rawAvatarFile = $state<File | null>(null);
	let showCropModal = $state(false);
	let isUploadingAvatar = $state(false);
	let isDeletingGroup = $state(false);

	let showDeleteGroupModal = $state(false);
	let activeTab = $state<'info' | 'media' | 'members'>('info');

	const isUser = $derived(type === 'direct');
	const isGroup = $derived(type === 'group');
	const isBroadcast = $derived(type === 'broadcast');

	const userTarget = $derived(isUser ? (target as UserRecord) : null);
	const groupTarget = $derived(!isUser ? (target as GroupRecord) : null);

	const isGroupOwner = $derived(
		isGroup && (groupTarget?.created_by === $currentUser?.id || $currentUser?.role === 'superadmin')
	);

	const title = $derived(isUser ? (userTarget?.name || userTarget?.username || '') : (groupTarget?.name || '📢 Pengumuman Sekolah'));
	const subtitle = $derived(
		isUser
			? (userTarget?.role === 'teacher' ? 'Guru Sekolah' : (userTarget?.class_name ? `Siswa · ${userTarget.class_name}` : 'Siswa'))
			: isGroup
			? (groupTarget?.type === 'class' ? 'Grup Kelas' : 'Komunitas')
			: 'Saluran Pengumuman Resmi'
	);
	const initials = $derived(getInitials(title));

	// Media attachments from messages
	const mediaAttachments = $derived.by(() => {
		const list: { msgId: string; file: string; url: string }[] = [];
		for (const msg of messages) {
			if (msg.attachments && msg.attachments.length > 0) {
				for (const att of msg.attachments) {
					list.push({
						msgId: msg.id,
						file: att,
						url: pb.files.getUrl(msg, att)
					});
				}
			}
		}
		return list;
	});

	$effect(() => {
		if (target?.id) {
			loadMembers();
		}
	});

	async function loadMembers() {
		if (isUser) return;
		isLoadingMembers = true;
		groupMembers = [];
		try {
			let members: UserRecord[] = [];
			if (isBroadcast) {
				const res = await pb.collection('users').getFullList({ sort: 'name' });
				members = res as unknown as UserRecord[];
			} else if (isGroup && groupTarget?.id) {
				const res = await pb.collection('group_members').getFullList({
					filter: `group="${groupTarget.id}"`,
					expand: 'user'
				});
				members = res.map(r => r.expand?.user).filter(Boolean) as unknown as UserRecord[];
			}

			// Sort so current user (Anda) is always at the top
			groupMembers = members.sort((a, b) => {
				if (a.id === $currentUser?.id) return -1;
				if (b.id === $currentUser?.id) return 1;
				const nameA = a.name || a.username || '';
				const nameB = b.name || b.username || '';
				return nameA.localeCompare(nameB);
			});
		} catch (err) {
			console.error('Failed to load members:', err);
		} finally {
			isLoadingMembers = false;
		}
	}

	const filteredMembers = $derived.by(() => {
		if (!memberSearchQuery) return groupMembers;
		const q = memberSearchQuery.toLowerCase();
		return groupMembers.filter(m => (m.name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q));
	});

	function handleGroupAvatarFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		rawAvatarFile = file;
		showCropModal = true;
		if (avatarInput) avatarInput.value = '';
	}

	async function handleGroupAvatarCropped(croppedBlob: Blob) {
		if (!groupTarget?.id) return;
		isUploadingAvatar = true;
		try {
			const formData = new FormData();
			formData.append('avatar', croppedBlob, 'group_avatar.jpg');
			await pb.collection('groups').update(groupTarget.id, formData);
			alert('Foto grup berhasil diperbarui!');
		} catch (err: any) {
			console.error('Failed to update group avatar:', err);
			alert('Gagal mengunggah foto grup: ' + (err?.message || 'Error'));
		} finally {
			isUploadingAvatar = false;
			rawAvatarFile = null;
		}
	}

	async function handleDeleteGroup() {
		if (!groupTarget?.id) return;
		isDeletingGroup = true;
		try {
			await pb.collection('groups').delete(groupTarget.id);
			alert(`Grup "${groupTarget.name}" telah dihapus.`);
			showDeleteGroupModal = false;
			onGroupDeleted?.();
		} catch (err: any) {
			console.error('Failed to delete group:', err);
			alert('Gagal menghapus grup: ' + (err?.message || 'Error'));
		} finally {
			isDeletingGroup = false;
		}
	}
</script>

<!-- Mobile Overlay Backdrop -->
<button
	type="button"
	onclick={onClose}
	class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs xl:hidden border-0 cursor-default"
	aria-label="Tutup Detail"
></button>

<!-- Hidden File Input for Group Avatar -->
{#if isGroupOwner}
	<input
		bind:this={avatarInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={handleGroupAvatarFileSelect}
	/>
{/if}

<!-- Slide-over Drawer on Mobile / Fixed Sidebar on XL Desktop -->
<aside
	class="fixed inset-y-0 right-0 z-50 flex w-75 xl:w-68.75 shrink-0 flex-col border-l border-[#DDE5E0] bg-white shadow-2xl xl:shadow-none xl:static transition-transform duration-200"
>
	<!-- Header -->
	<div class="flex h-16 items-center justify-between border-b border-[#DDE5E0] px-4">
		<strong class="font-['Manrope'] text-sm font-bold text-[#24313A]">Detail percakapan</strong>
		<button
			type="button"
			onclick={onClose}
			aria-label="Tutup Detail"
			class="grid h-8 w-8 place-items-center rounded-lg text-[#6F7B7B] hover:bg-[#EEF3F0] transition cursor-pointer"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	<!-- Profile Summary -->
	<div class="border-b border-[#DDE5E0] px-4 py-5 text-center">
		{#if isUser && userTarget?.avatar}
			<img src={getAvatarUrl(userTarget)} alt={title} class="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover ring-2 ring-[#DDE5E0]" />
		{:else if !isUser && groupTarget?.avatar}
			<div class="relative inline-block mx-auto mb-3">
				<img src={getAvatarUrl(groupTarget)} alt={title} class="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#DDE5E0]" />
				{#if isGroupOwner}
					<button
						type="button"
						onclick={() => avatarInput?.click()}
						title="Ubah Foto Grup"
						class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 rounded-2xl flex items-center justify-center transition text-white cursor-pointer"
					>
						<Camera class="h-4 w-4" />
					</button>
				{/if}
			</div>
		{:else}
			<div class="relative inline-block mx-auto mb-3">
				<div class="grid h-14 w-14 place-items-center rounded-2xl font-['Manrope'] text-xl font-bold text-[#6F9A7C] bg-[#A9C8B3]/30">
					{initials}
				</div>
				{#if isGroupOwner}
					<button
						type="button"
						onclick={() => avatarInput?.click()}
						title="Ubah Foto Grup"
						class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 rounded-2xl flex items-center justify-center transition text-white cursor-pointer"
					>
						<Camera class="h-4 w-4" />
					</button>
				{/if}
			</div>
		{/if}

		<h2 class="font-['Manrope'] text-base font-bold text-[#24313A] truncate">{title}</h2>
		<p class="mt-1 text-xs text-[#6F7B7B] leading-relaxed">
			{subtitle}<br />
			{#if isUser}
				<span class="inline-flex items-center gap-1 font-semibold text-[11px] mt-1 {userTarget?.online ? 'text-[#6F9A7C]' : 'text-[#A5AEAA]'}">
					<span class="h-1.5 w-1.5 rounded-full {userTarget?.online ? 'bg-[#6F9A7C]' : 'bg-[#A5AEAA]'}"></span>
					{userTarget?.online ? 'Online sekarang' : 'Offline'}
				</span>
			{/if}
		</p>
	</div>

	<!-- Navigation Tabs -->
	<div class="flex border-b border-[#DDE5E0] bg-[#EEF3F0]/50 p-1 text-xs font-semibold text-[#6F7B7B]">
		<button
			type="button"
			onclick={() => (activeTab = 'info')}
			class="flex-1 py-1.5 rounded-md text-center transition cursor-pointer {activeTab === 'info' ? 'bg-white text-[#24313A] shadow-xs' : 'hover:text-[#24313A]'}"
		>
			Info
		</button>
		<button
			type="button"
			onclick={() => (activeTab = 'media')}
			class="flex-1 py-1.5 rounded-md text-center transition cursor-pointer {activeTab === 'media' ? 'bg-white text-[#24313A] shadow-xs' : 'hover:text-[#24313A]'}"
		>
			Media ({mediaAttachments.length})
		</button>
		{#if isGroup}
			<button
				type="button"
				onclick={() => (activeTab = 'members')}
				class="flex-1 py-1.5 rounded-md text-center transition cursor-pointer {activeTab === 'members' ? 'bg-white text-[#24313A] shadow-xs' : 'hover:text-[#24313A]'}"
			>
				Anggota ({groupMembers.length})
			</button>
		{/if}
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
		{#if activeTab === 'info'}
			<!-- Quick Media Action -->
			<div class="space-y-2">
				<div class="text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Media & File</div>

				<button
					type="button"
					onclick={() => (activeTab = 'media')}
					class="flex w-full items-center gap-2.5 rounded-lg border border-[#DDE5E0] p-2 text-[11px] font-semibold text-[#24313A] hover:bg-[#EEF3F0] transition cursor-pointer"
				>
					<Image class="h-3.5 w-3.5 text-[#5F98A5]" />
					<span>Lihat media ({mediaAttachments.length})</span>
				</button>
			</div>

			<!-- Profile Details for 1:1 -->
			{#if isUser && userTarget}
				<div class="space-y-3 pt-2 border-t border-[#DDE5E0]">
					<div class="text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Informasi Profil</div>

					<div class="space-y-2.5">
						<div class="flex items-center gap-2.5">
							<div class="grid h-7 w-7 place-items-center rounded-lg bg-[#A9C8B3]/30 text-xs font-bold text-[#6F9A7C]">
								🎓
							</div>
							<div class="min-w-0 flex-1">
								<strong class="block text-[11px] font-medium text-[#24313A]">Peran / Kelas</strong>
								<span class="block text-[10px] text-[#6F7B7B]">{subtitle}</span>
							</div>
						</div>

						{#if userTarget.username}
							<div class="flex items-center gap-2.5">
								<div class="grid h-7 w-7 place-items-center rounded-lg bg-[#8FBBC5]/30 text-xs font-bold text-[#5F98A5]">
									ID
								</div>
								<div class="min-w-0 flex-1">
									<strong class="block text-[11px] font-medium text-[#24313A]">Username</strong>
									<span class="block text-[10px] text-[#6F7B7B]">@{userTarget.username}</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Group Admin Actions -->
			{#if isGroupOwner}
				<div class="pt-2 border-t border-[#DDE5E0] space-y-2">
					<div class="text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Pengaturan Grup</div>

					<button
						type="button"
						onclick={() => avatarInput?.click()}
						class="flex w-full items-center gap-2.5 rounded-lg border border-[#DDE5E0] p-2 text-[11px] font-semibold text-[#5F98A5] hover:bg-[#8FBBC5]/20 transition cursor-pointer"
					>
						<Camera class="h-3.5 w-3.5" />
						<span>Ubah Foto Grup</span>
					</button>

					<button
						type="button"
						onclick={() => (showDeleteGroupModal = true)}
						class="flex w-full items-center gap-2.5 rounded-lg border border-[#DDE5E0] p-2 text-[11px] font-semibold text-[#C96F6F] hover:bg-[#E9A58F]/20 transition cursor-pointer"
					>
						<Trash2 class="h-3.5 w-3.5" />
						<span>Hapus Grup Ini</span>
					</button>
				</div>
			{/if}

		{:else if activeTab === 'media'}
			<div>
				<div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Galeri Media</div>
				{#if mediaAttachments.length === 0}
					<p class="text-xs text-[#A5AEAA] italic text-center py-6">Belum ada media terkirim.</p>
				{:else}
					<div class="grid grid-cols-3 gap-1.5">
						{#each mediaAttachments as m (m.url)}
							{#if isImageFile(m.file)}
								<button
									type="button"
									onclick={() => onPreviewImage?.(m.url)}
									class="group relative aspect-square overflow-hidden rounded-lg border border-[#DDE5E0] bg-[#EEF3F0] cursor-pointer text-left"
								>
									<img src={m.url} alt="Attachment" class="h-full w-full object-cover transition group-hover:scale-105" />
								</button>
							{:else}
								<a
									href={m.url}
									target="_blank"
									download
									class="group relative aspect-square overflow-hidden rounded-lg border border-[#DDE5E0] bg-[#EEF3F0] grid place-items-center p-1 text-center"
								>
									<div class="text-[10px] font-bold text-[#5F98A5]">
										📄 {m.file.slice(-6)}
									</div>
								</a>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

		{:else if activeTab === 'members' && isGroup}
			<div>
				<div class="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">
					<span>{isBroadcast ? 'Penerima Siaran' : 'Anggota Grup'}</span>
					<span>({filteredMembers.length})</span>
				</div>

				{#if groupMembers.length > 5}
					<input
						type="text"
						bind:value={memberSearchQuery}
						placeholder="Cari anggota..."
						class="w-full mb-2.5 rounded-xl border border-[#DDE5E0] bg-[#EEF3F0] px-3 py-1.5 text-xs text-[#24313A] focus:outline-none focus:ring-1 focus:ring-[#5F98A5]"
					/>
				{/if}

				{#if isLoadingMembers}
					<p class="text-xs text-[#A5AEAA] italic text-center py-6">Memuat anggota...</p>
				{:else if filteredMembers.length === 0}
					<p class="text-xs text-[#A5AEAA] italic text-center py-6">Anggota tidak ditemukan.</p>
				{:else}
					<div class="space-y-1.5">
						{#each filteredMembers as m (m.id)}
							<button
								type="button"
								onclick={() => {
									if (m.id !== $currentUser?.id && onSelectUser) {
										onSelectUser(m);
										onClose?.();
									}
								}}
								disabled={m.id === $currentUser?.id}
								title={m.id === $currentUser?.id ? 'Kamu' : 'Klik untuk chat 1:1'}
								class="flex w-full items-center gap-2.5 rounded-xl border border-[#DDE5E0] p-2 bg-white hover:bg-[#EEF3F0] text-left transition cursor-pointer disabled:cursor-default disabled:hover:bg-white"
							>
								{#if m.avatar}
									<img src={getAvatarUrl(m)} alt={m.name} class="h-8 w-8 rounded-full object-cover shrink-0" />
								{:else}
									<div class="grid h-8 w-8 place-items-center rounded-full bg-[#8FBBC5] text-[10px] font-bold text-[#24313A] shrink-0">
										{getInitials(m.name || m.username)}
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<strong class="block truncate text-xs font-semibold text-[#24313A]">
										{m.name || m.username} {m.id === $currentUser?.id ? '(Anda)' : ''}
									</strong>
									<span class="block truncate text-[9px] text-[#6F7B7B]">
										{m.role === 'teacher' ? '👨‍🏫 Guru' : m.role === 'superadmin' ? '👑 Admin' : '🎓 Siswa'}
									</span>
								</div>
								{#if m.id !== $currentUser?.id}
									<MessageSquare class="h-3.5 w-3.5 text-[#5F98A5] shrink-0" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</aside>

<!-- Group Avatar Crop Modal -->
<CropAvatarModal
	bind:isOpen={showCropModal}
	imageFile={rawAvatarFile}
	onCropComplete={handleGroupAvatarCropped}
/>

<!-- Delete Group Modal -->
{#if showDeleteGroupModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
		<div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#DDE5E0] space-y-4">
			<div class="flex items-center gap-3 text-[#C96F6F]">
				<div class="grid h-10 w-10 place-items-center rounded-xl bg-[#E9A58F]/20">
					<AlertTriangle class="h-5 w-5" />
				</div>
				<div>
					<h3 class="font-bold text-sm text-[#24313A]">Hapus Grup Ini?</h3>
					<p class="text-xs text-[#6F7B7B]">Semua data & riwayat grup ini akan dihapus permanen.</p>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={() => (showDeleteGroupModal = false)}
					class="rounded-xl px-4 py-2 text-xs font-semibold text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer"
				>
					Batal
				</button>
				<button
					type="button"
					onclick={handleDeleteGroup}
					disabled={isDeletingGroup}
					class="rounded-xl bg-[#C96F6F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B85E5E] cursor-pointer shadow-xs disabled:opacity-50"
				>
					{isDeletingGroup ? 'Menghapus...' : 'Ya, Hapus Grup'}
				</button>
			</div>
		</div>
	</div>
{/if}
