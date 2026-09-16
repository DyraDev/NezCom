<script lang="ts">
	import type { UserRecord } from '$lib/types';
	import { getAvatarUrl, logout, pb } from '$lib/pocketbase';
	import { getInitials } from '$lib/formatters';
	import { ShieldAlert, LogOut, Plus, Camera } from 'lucide-svelte';
	import CropAvatarModal from '$lib/components/modals/CropAvatarModal.svelte';

	let {
		user,
		onOpenAdminModal,
		onOpenCreateGroupModal
	}: {
		user: UserRecord | null;
		onOpenAdminModal?: () => void;
		onOpenCreateGroupModal?: () => void;
	} = $props();

	let fileInput: HTMLInputElement | null = $state(null);
	let selectedFile = $state<File | null>(null);
	let showCropModal = $state(false);
	let isUploading = $state(false);

	const initials = $derived(getInitials(user?.name || user?.username));

	function handleAvatarFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		selectedFile = file;
		showCropModal = true;
		if (fileInput) fileInput.value = '';
	}

	async function handleCroppedUpload(croppedBlob: Blob) {
		if (!user?.id) return;
		isUploading = true;
		try {
			const formData = new FormData();
			formData.append('avatar', croppedBlob, 'avatar.jpg');
			await pb.collection('users').update(user.id, formData);
		} catch (err) {
			console.error('Failed to upload avatar:', err);
			alert('Gagal mengunggah foto profil');
		} finally {
			isUploading = false;
			selectedFile = null;
		}
	}
</script>

<div class="border-t border-[#DDE5E0] bg-[#FFFFFF] p-3.5">
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={handleAvatarFileSelect}
	/>

	<div class="flex items-center justify-between gap-2">
		<div class="flex min-w-0 items-center gap-2.5">
			<button
				type="button"
				onclick={() => fileInput?.click()}
				disabled={isUploading}
				title="Ubah Foto Profil"
				class="relative group shrink-0 cursor-pointer rounded-full overflow-hidden"
			>
				{#if user?.avatar}
					<img src={getAvatarUrl(user)} alt="Avatar" class="h-9 w-9 rounded-full object-cover ring-1 ring-[#DDE5E0]" />
				{:else}
					<div class="grid h-9 w-9 place-items-center rounded-full bg-[#8FBBC5] text-xs font-bold text-[#24313A]">
						{initials}
					</div>
				{/if}
				<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full text-white">
					<Camera class="h-3.5 w-3.5" />
				</div>
			</button>

			<div class="min-w-0 flex-1">
				<strong class="block truncate text-xs font-semibold text-[#24313A]">{user?.name || user?.username}</strong>
				<span class="block truncate text-[10px] text-[#6F7B7B]">
					{#if user?.role === 'superadmin'}
						👑 Superadmin
					{:else if user?.role === 'teacher'}
						👨‍🏫 Guru Sekolah
					{:else}
						🎓 {user?.class_name || 'Siswa'}
					{/if}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-1 shrink-0">
			{#if (user?.role === 'superadmin' || user?.role === 'teacher') && onOpenCreateGroupModal}
				<button
					type="button"
					onclick={onOpenCreateGroupModal}
					title="Buat Grup Baru"
					class="grid h-8 w-8 place-items-center rounded-lg bg-[#EEF3F0] text-[#5F98A5] hover:bg-[#8FBBC5]/30 cursor-pointer transition"
				>
					<Plus class="h-4 w-4" />
				</button>
			{/if}

			{#if user?.role === 'superadmin' && onOpenAdminModal}
				<button
					type="button"
					onclick={onOpenAdminModal}
					title="Superadmin Control Panel"
					class="grid h-8 w-8 place-items-center rounded-lg bg-[#E9A58F]/20 text-[#C96F6F] hover:bg-[#E9A58F]/40 cursor-pointer transition"
				>
					<ShieldAlert class="h-4 w-4" />
				</button>
			{/if}

			<button
				type="button"
				onclick={logout}
				title="Keluar"
				class="grid h-8 w-8 place-items-center rounded-lg text-[#6F7B7B] hover:bg-[#EEF3F0] hover:text-[#C96F6F] cursor-pointer transition"
			>
				<LogOut class="h-4 w-4" />
			</button>
		</div>
	</div>
</div>

<CropAvatarModal
	bind:isOpen={showCropModal}
	imageFile={selectedFile}
	onCropComplete={handleCroppedUpload}
/>
