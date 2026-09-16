<script lang="ts">
	import { pb, currentUser } from '$lib/pocketbase';
	import type { UserRecord } from '$lib/types';
	import { X, Users, Plus, Check, Camera } from 'lucide-svelte';
	import CropAvatarModal from '$lib/components/modals/CropAvatarModal.svelte';

	let { isOpen = $bindable(false), onGroupCreated }: { isOpen: boolean; onGroupCreated?: () => void } = $props();

	let groupName = $state('');
	let groupType = $state<'custom' | 'class'>('custom');
	let classNameRef = $state('');
	let selectedUserIds = $state<string[]>([]);
	let allUsers = $state<UserRecord[]>([]);
	let isLoading = $state(false);
	let errorMsg = $state('');

	// Group Avatar State
	let avatarInput: HTMLInputElement | null = $state(null);
	let rawAvatarFile = $state<File | null>(null);
	let croppedAvatarBlob = $state<Blob | null>(null);
	let croppedAvatarPreview = $state<string | null>(null);
	let showCropModal = $state(false);

	$effect(() => {
		if (isOpen) {
			loadUsers();
		}
	});

	async function loadUsers() {
		try {
			const res = await pb.collection('users').getFullList({
				sort: 'name',
				filter: `id != "${$currentUser?.id}"`
			});
			allUsers = res as unknown as UserRecord[];
		} catch (err) {
			console.error('Error loading users for group modal:', err);
		}
	}

	function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		rawAvatarFile = file;
		showCropModal = true;
		if (avatarInput) avatarInput.value = '';
	}

	function handleCropped(blob: Blob) {
		croppedAvatarBlob = blob;
		croppedAvatarPreview = URL.createObjectURL(blob);
	}

	function toggleUserSelect(userId: string) {
		if (selectedUserIds.includes(userId)) {
			selectedUserIds = selectedUserIds.filter(id => id !== userId);
		} else {
			selectedUserIds = [...selectedUserIds, userId];
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!groupName.trim()) {
			errorMsg = 'Nama grup tidak boleh kosong.';
			return;
		}

		isLoading = true;
		errorMsg = '';

		try {
			const formData = new FormData();
			formData.append('name', groupName.trim());
			formData.append('type', groupType);
			formData.append('class_name_ref', groupType === 'class' ? classNameRef.trim() : '');
			formData.append('created_by', $currentUser?.id || '');

			if (croppedAvatarBlob) {
				formData.append('avatar', croppedAvatarBlob, 'group_avatar.jpg');
			}

			const group = await pb.collection('groups').create(formData);

			// Add creator to group_members
			await pb.collection('group_members').create({
				group: group.id,
				user: $currentUser?.id,
				joined_at: new Date().toISOString()
			});

			// Add selected users to group_members
			for (const uId of selectedUserIds) {
				await pb.collection('group_members').create({
					group: group.id,
					user: uId,
					joined_at: new Date().toISOString()
				});
			}

			groupName = '';
			selectedUserIds = [];
			croppedAvatarBlob = null;
			croppedAvatarPreview = null;
			isOpen = false;
			if (onGroupCreated) onGroupCreated();
		} catch (err: any) {
			console.error('Failed to create group:', err);
			errorMsg = err?.message || 'Gagal membuat grup.';
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#24313A]/50 p-4 backdrop-blur-xs">
		<div class="w-full max-w-md rounded-xl border border-[#DDE5E0] bg-white p-5 shadow-lg">
			<div class="flex items-center justify-between border-b border-[#DDE5E0] pb-3 mb-4">
				<div class="flex items-center gap-2 font-['Manrope',sans-serif] text-sm font-bold text-[#24313A]">
					<Users class="h-4.5 w-4.5 text-[#5F98A5]" />
					Buat Grup Baru
				</div>
				<button type="button" onclick={() => (isOpen = false)} class="rounded-md p-1 text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer">
					<X class="h-4 w-4" />
				</button>
			</div>

			{#if errorMsg}
				<div class="mb-4 rounded-lg border border-[#C96F6F]/30 bg-[#C96F6F]/10 p-2.5 text-xs text-[#C96F6F]">
					{errorMsg}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-3.5">
				<!-- Avatar Selection & Preview -->
				<div class="flex flex-col items-center justify-center">
					<input
						bind:this={avatarInput}
						type="file"
						accept="image/*"
						class="hidden"
						onchange={handleFileSelect}
					/>
					<button
						type="button"
						onclick={() => avatarInput?.click()}
						class="relative group grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF3F0] text-[#5F98A5] border-2 border-dashed border-[#8FBBC5] hover:border-[#5F98A5] transition cursor-pointer overflow-hidden"
					>
						{#if croppedAvatarPreview}
							<img src={croppedAvatarPreview} alt="Group Avatar" class="h-full w-full object-cover" />
						{:else}
							<div class="flex flex-col items-center text-center">
								<Camera class="h-5 w-5 mb-0.5" />
								<span class="text-[9px] font-semibold">Foto Grup</span>
							</div>
						{/if}
						<div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-bold">
							Ubah
						</div>
					</button>
				</div>

				<div>
					<label for="gName" class="block text-xs font-semibold text-[#24313A] mb-1">Nama Grup</label>
					<input
						id="gName"
						type="text"
						bind:value={groupName}
						placeholder="Misal: Panitia Ujian / Ekstrakurikuler IT"
						class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] px-3 py-2 text-xs text-[#24313A] focus:border-[#5F98A5] focus:bg-white focus:outline-none"
						required
					/>
				</div>

				{#if $currentUser?.role === 'superadmin'}
					<div>
						<label for="gType" class="block text-xs font-semibold text-[#24313A] mb-1">Tipe Grup</label>
						<select
							id="gType"
							bind:value={groupType}
							class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] px-3 py-2 text-xs text-[#24313A] focus:border-[#5F98A5] focus:bg-white focus:outline-none"
						>
							<option value="custom">Grup Komunitas / Custom</option>
							<option value="class">Grup Kelas Official</option>
						</select>
					</div>

					{#if groupType === 'class'}
						<div>
							<label for="cRef" class="block text-xs font-semibold text-[#24313A] mb-1">Kode Kelas Reference</label>
							<input
								id="cRef"
								type="text"
								bind:value={classNameRef}
								placeholder="Misal: 11 TKJ 1"
								class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] px-3 py-2 text-xs text-[#24313A] focus:border-[#5F98A5] focus:bg-white focus:outline-none"
							/>
						</div>
					{/if}
				{/if}

				<div>
					<span class="block text-xs font-semibold text-[#24313A] mb-1">Pilih Anggota ({selectedUserIds.length} terpilih)</span>
					<div class="max-h-40 overflow-y-auto rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-1.5 space-y-1 custom-scrollbar">
						{#each allUsers as u}
							<button
								type="button"
								onclick={() => toggleUserSelect(u.id)}
								class="flex w-full items-center justify-between rounded-md p-1.5 text-left text-xs transition cursor-pointer {selectedUserIds.includes(u.id) ? 'bg-[#8FBBC5]/25 text-[#24313A] font-semibold' : 'text-[#24313A] hover:bg-[#EEF3F0]'}"
							>
								<div>
									<div class="font-medium">{u.name || u.username}</div>
									<div class="text-[10px] text-[#6F7B7B]">{u.role === 'teacher' ? '👨‍🏫 Guru' : '🎓 ' + (u.class_name || 'Siswa')}</div>
								</div>
								{#if selectedUserIds.includes(u.id)}
									<Check class="h-3.5 w-3.5 text-[#5F98A5]" />
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-3 border-t border-[#DDE5E0]">
					<button
						type="button"
						onclick={() => (isOpen = false)}
						class="rounded-lg border border-[#DDE5E0] px-3.5 py-1.5 text-xs font-semibold text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={isLoading}
						class="flex items-center gap-1.5 rounded-lg bg-[#5F98A5] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#5F98A5]/90 cursor-pointer disabled:opacity-50"
					>
						<Plus class="h-4 w-4" />
						Buat Grup
					</button>
				</div>
			</form>
		</div>
	</div>

	<CropAvatarModal
		bind:isOpen={showCropModal}
		imageFile={rawAvatarFile}
		onCropComplete={handleCropped}
	/>
{/if}
