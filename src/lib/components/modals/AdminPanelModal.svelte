<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import type { UserRecord } from '$lib/types';
	import { X, Upload, UserPlus, ShieldAlert, Check, FileSpreadsheet, Users } from 'lucide-svelte';

	let { isOpen = $bindable(false), onUsersUpdated }: { isOpen: boolean; onUsersUpdated?: () => void } = $props();

	let activeTab = $state<'bulk' | 'manual' | 'whitelist'>('bulk');

	let csvText = $state('');
	let isImporting = $state(false);
	let importLogs = $state<string[]>([]);

	let manualUsername = $state('');
	let manualName = $state('');
	let manualRole = $state<'student' | 'teacher' | 'superadmin'>('student');
	let manualClassName = $state('');
	let manualPassword = $state('');
	let manualCanBroadcast = $state(false);

	let teachersList = $state<UserRecord[]>([]);
	let broadcastPolicy = $state('whitelisted_only');

	$effect(() => {
		if (isOpen) {
			loadTeachers();
			loadPolicy();
		}
	});

	async function loadTeachers() {
		try {
			const res = await pb.collection('users').getFullList({ filter: 'role="teacher"', sort: 'name' });
			teachersList = res as unknown as UserRecord[];
		} catch (err) {
			console.error('Error loading teachers:', err);
		}
	}

	async function loadPolicy() {
		try {
			const res = await pb.collection('app_settings').getFirstListItem('key="broadcast_policy"').catch(() => null);
			if (res) broadcastPolicy = res.value;
		} catch (err) {
			console.error('Error loading policy:', err);
		}
	}

	async function toggleTeacherBroadcast(teacher: UserRecord) {
		try {
			const updated = !teacher.can_broadcast;
			await pb.collection('users').update(teacher.id, { can_broadcast: updated });
			teacher.can_broadcast = updated;
			teachersList = [...teachersList];
		} catch (err) {
			console.error('Failed to update teacher broadcast:', err);
		}
	}

	async function savePolicySetting(val: string) {
		broadcastPolicy = val;
		try {
			const setting = await pb.collection('app_settings').getFirstListItem('key="broadcast_policy"').catch(() => null);
			if (setting) {
				await pb.collection('app_settings').update(setting.id, { value: val });
			} else {
				await pb.collection('app_settings').create({ key: 'broadcast_policy', value: val });
			}
		} catch (err) {
			console.error('Failed to update policy setting:', err);
		}
	}

	async function handleManualCreate(e: Event) {
		e.preventDefault();
		try {
			const email = `${manualUsername.trim()}@nezcom.local`;
			const newUser = await pb.collection('users').create({
				username: manualUsername.trim(),
				name: manualName.trim(),
				email,
				emailVisibility: true,
				password: manualPassword,
				passwordConfirm: manualPassword,
				role: manualRole,
				class_name: manualClassName.trim(),
				can_broadcast: manualCanBroadcast
			});

			if (manualRole === 'student' && manualClassName.trim()) {
				await autoAssignToClassGroup(manualClassName.trim(), newUser.id);
			}

			alert(`Pengguna ${manualUsername} berhasil ditambahkan!`);
			manualUsername = '';
			manualName = '';
			manualClassName = '';
			if (onUsersUpdated) onUsersUpdated();
		} catch (err: any) {
			alert('Gagal menambah user: ' + (err?.message || 'Error'));
		}
	}

	async function autoAssignToClassGroup(className: string, userId: string) {
		try {
			let group = await pb.collection('groups').getFirstListItem(`class_name_ref="${className}"`).catch(() => null);
			if (!group) {
				group = await pb.collection('groups').create({
					name: `Grup Kelas ${className}`,
					type: 'class',
					class_name_ref: className
				});
			}

			if (!group) return;

			const existingMember = await pb.collection('group_members').getFirstListItem(`group="${group.id}" && user="${userId}"`).catch(() => null);
			if (!existingMember) {
				await pb.collection('group_members').create({
					group: group.id,
					user: userId,
					joined_at: new Date().toISOString()
				});
			}
		} catch (err) {
			console.error('Auto class assign error:', err);
		}
	}

	async function handleBulkImport() {
		if (!csvText.trim()) return;
		isImporting = true;
		importLogs = [];

		const lines = csvText.trim().split('\n');
		let successCount = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line || line.startsWith('username,')) continue;

			const parts = line.split(',').map(s => s.trim());
			if (parts.length < 3) continue;

			const [uname, name, role, cName, pass] = parts;
			const userRole = role || 'student';
			const userPass = pass || 'siswa123456';
			const className = cName || '';

			try {
				const email = `${uname}@nezcom.local`;
				const newUser = await pb.collection('users').create({
					username: uname,
					name: name || uname,
					email,
					emailVisibility: true,
					password: userPass,
					passwordConfirm: userPass,
					role: userRole,
					class_name: className
				});

				if (userRole === 'student' && className) {
					await autoAssignToClassGroup(className, newUser.id);
				}

				successCount++;
				importLogs.push(`✅ [Baris ${i + 1}] User ${uname} (${className}) berhasil ditambahkan.`);
			} catch (err: any) {
				importLogs.push(`❌ [Baris ${i + 1}] Gagal menambah ${uname}: ${err?.message || 'Error'}`);
			}
		}

		importLogs.push(`🎉 Impor Selesai! Total ${successCount} akun berhasil diproses.`);
		isImporting = false;
		csvText = '';
		if (onUsersUpdated) onUsersUpdated();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-[#24313A]/50 p-4 backdrop-blur-xs">
		<div class="w-full max-w-xl rounded-xl border border-[#DDE5E0] bg-white p-5 shadow-lg">
			<div class="flex items-center justify-between border-b border-[#DDE5E0] pb-3 mb-4">
				<div class="flex items-center gap-2 font-['Manrope',sans-serif] text-sm font-bold text-[#24313A]">
					<ShieldAlert class="h-4.5 w-4.5 text-[#5F98A5]" />
					Superadmin Control Panel
				</div>
				<button type="button" onclick={() => (isOpen = false)} class="rounded-md p-1 text-[#6F7B7B] hover:bg-[#EEF3F0] cursor-pointer">
					<X class="h-4 w-4" />
				</button>
			</div>

			<div class="flex gap-2 border-b border-[#DDE5E0] pb-2.5 mb-4 text-xs font-semibold">
				<button
					type="button"
					onclick={() => (activeTab = 'bulk')}
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer {activeTab === 'bulk' ? 'bg-[#5F98A5] text-white' : 'text-[#6F7B7B] hover:bg-[#EEF3F0]'}"
				>
					<FileSpreadsheet class="h-4 w-4" />
					Bulk Import CSV
				</button>

				<button
					type="button"
					onclick={() => (activeTab = 'manual')}
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer {activeTab === 'manual' ? 'bg-[#5F98A5] text-white' : 'text-[#6F7B7B] hover:bg-[#EEF3F0]'}"
				>
					<UserPlus class="h-4 w-4" />
					Tambah User Manual
				</button>

				<button
					type="button"
					onclick={() => (activeTab = 'whitelist')}
					class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer {activeTab === 'whitelist' ? 'bg-[#5F98A5] text-white' : 'text-[#6F7B7B] hover:bg-[#EEF3F0]'}"
				>
					<Users class="h-4 w-4" />
					Whitelist Broadcast
				</button>
			</div>

			{#if activeTab === 'bulk'}
				<div class="space-y-3.5">
					<div class="rounded-lg border border-[#8FBBC5]/40 bg-[#8FBBC5]/15 p-3 text-xs text-[#24313A]">
						💡 Format CSV: <code>username,nama,role,kelas,password</code><br />
						Contoh: <code class="font-bold">budi.tkj,Budi Santoso,student,11 TKJ 1,siswa123456</code>
					</div>

					<div>
						<label for="csvIn" class="block text-xs font-semibold text-[#24313A] mb-1">Data CSV Siswa / Guru:</label>
						<textarea
							id="csvIn"
							bind:value={csvText}
							rows="5"
							placeholder="budi.tkj,Budi Santoso,student,11 TKJ 1,siswa123456"
							class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2.5 font-mono text-xs text-[#24313A] placeholder-[#A5AEAA] focus:border-[#5F98A5] focus:bg-white focus:outline-none"
						></textarea>
					</div>

					<button
						type="button"
						onclick={handleBulkImport}
						disabled={isImporting || !csvText.trim()}
						class="flex items-center gap-2 rounded-lg bg-[#5F98A5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5F98A5]/90 disabled:opacity-40 cursor-pointer"
					>
						<Upload class="h-4 w-4" />
						{isImporting ? 'Memproses Impor...' : 'Mulai Impor Bulk'}
					</button>

					{#if importLogs.length > 0}
						<div class="max-h-36 overflow-y-auto rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2.5 font-mono text-[11px] text-[#24313A] space-y-1 custom-scrollbar">
							{#each importLogs as log}
								<div>{log}</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if activeTab === 'manual'}
				<form onsubmit={handleManualCreate} class="grid grid-cols-2 gap-3 text-xs">
					<div>
						<label for="mUname" class="block font-semibold text-[#24313A] mb-1">Username</label>
						<input id="mUname" type="text" bind:value={manualUsername} placeholder="rudi.tkj" class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2 text-[#24313A]" required />
					</div>
					<div>
						<label for="mName" class="block font-semibold text-[#24313A] mb-1">Nama Lengkap</label>
						<input id="mName" type="text" bind:value={manualName} placeholder="Rudi Hartono" class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2 text-[#24313A]" required />
					</div>
					<div>
						<label for="mRole" class="block font-semibold text-[#24313A] mb-1">Role</label>
						<select id="mRole" bind:value={manualRole} class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2 text-[#24313A]">
							<option value="student">🎓 Siswa</option>
							<option value="teacher">👨‍🏫 Guru</option>
							<option value="superadmin">👑 Superadmin</option>
						</select>
					</div>
					<div>
						<label for="mClass" class="block font-semibold text-[#24313A] mb-1">Kelas (jika siswa)</label>
						<input id="mClass" type="text" bind:value={manualClassName} placeholder="11 TKJ 1" class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2 text-[#24313A]" />
					</div>
					<div>
						<label for="mPass" class="block font-semibold text-[#24313A] mb-1">Password</label>
						<input id="mPass" type="password" bind:value={manualPassword} class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-2 text-[#24313A]" required />
					</div>
					{#if manualRole === 'teacher'}
						<div class="flex items-center gap-2 pt-5">
							<input type="checkbox" id="mBrd" bind:checked={manualCanBroadcast} />
							<label for="mBrd" class="text-[#24313A] cursor-pointer font-medium">Izin Broadcast</label>
						</div>
					{/if}

					<div class="col-span-2 pt-2 flex justify-end">
						<button type="submit" class="rounded-lg bg-[#5F98A5] px-4 py-2 font-semibold text-white hover:bg-[#5F98A5]/90 cursor-pointer">
							Simpan Pengguna
						</button>
					</div>
				</form>
			{/if}

			{#if activeTab === 'whitelist'}
				<div class="space-y-3.5">
					<div class="flex items-center justify-between rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-3 text-xs">
						<div>
							<div class="font-bold text-[#24313A]">Kebijakan Broadcast Guru:</div>
							<div class="text-[11px] text-[#6F7B7B]">Pengaturan hak broadcast pengumuman untuk guru</div>
						</div>
						<select
							value={broadcastPolicy}
							onchange={(e) => savePolicySetting((e.target as HTMLSelectElement).value)}
							class="rounded-md border border-[#DDE5E0] bg-white px-2.5 py-1 text-xs font-semibold text-[#5F98A5] outline-none"
						>
							<option value="whitelisted_only">Hanya Ter-Whitelist</option>
							<option value="all_teachers">Semua Guru Boleh</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<span class="block text-xs font-semibold text-[#24313A]">Daftar Guru & Status Izin:</span>
						<div class="max-h-52 overflow-y-auto rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] p-1.5 space-y-1 custom-scrollbar">
							{#each teachersList as t}
								<div class="flex items-center justify-between rounded-md bg-white p-2 text-xs border border-[#DDE5E0]">
									<div>
										<div class="font-semibold text-[#24313A]">{t.name || t.username}</div>
										<div class="text-[10px] text-[#6F7B7B]">{t.email}</div>
									</div>

									<button
										type="button"
										onclick={() => toggleTeacherBroadcast(t)}
										class="flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition cursor-pointer {t.can_broadcast ? 'bg-[#A9C8B3]/30 text-[#6F9A7C]' : 'bg-[#EEF3F0] text-[#6F7B7B] hover:bg-[#DDE5E0]'}"
									>
										{#if t.can_broadcast}
											<Check class="h-3.5 w-3.5" /> Diizinkan
										{:else}
											Belum Diizinkan
										{/if}
									</button>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
