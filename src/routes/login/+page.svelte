<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import { User, Lock, ArrowRight } from 'lucide-svelte';

	let username = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let isLoading = $state(false);

	async function handleLogin(e?: Event) {
		if (e) e.preventDefault();
		errorMsg = '';
		if (!username.trim() || !password.trim()) {
			errorMsg = 'Harap isi NIS/username dan kata sandi.';
			return;
		}

		isLoading = true;
		try {
			const identity = username.trim();
			try {
				await pb.collection('users').authWithPassword(identity, password.trim());
			} catch (firstErr) {
				if (!identity.includes('@')) {
					await pb.collection('users').authWithPassword(`${identity}@nezcom.local`, password.trim());
				} else {
					throw firstErr;
				}
			}
			goto('/');
		} catch (err: any) {
			console.error('Login error:', err);
			errorMsg = err?.message || 'NIS/Username atau Kata Sandi salah.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="relative flex min-h-screen w-full items-center justify-center bg-[#F5F7F5] px-4 py-10 overflow-y-auto">
	<div class="w-full max-w-sm space-y-6">
		<!-- Brand & School Identity Header -->
		<div class="text-center space-y-2">
			<div class="flex justify-center mb-1">
				<BrandLogo size="lg" />
			</div>
			<p class="text-xs font-semibold text-[#6F7B7B]">Komunikasi sekolah, di satu tempat.</p>
		</div>

		<!-- Login Card -->
		<div class="rounded-2xl border border-[#DDE5E0] bg-white p-6 shadow-soft">
			{#if errorMsg}
				<div class="mb-4 rounded-lg border border-[#C96F6F]/30 bg-[#C96F6F]/10 p-2.5 text-xs text-[#C96F6F]">
					{errorMsg}
				</div>
			{/if}

			<form onsubmit={handleLogin} class="space-y-3.5">
				<div>
					<label for="uname" class="block text-xs font-bold text-[#24313A] mb-1">NIS / Username / Email</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6F7B7B]">
							<User class="h-4 w-4" />
						</div>
						<input
							id="uname"
							type="text"
							bind:value={username}
							placeholder="Masukkan NIS atau username"
							class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] py-2.5 pl-9 pr-3 text-xs text-[#24313A] placeholder-[#A5AEAA] outline-none transition focus:border-[#5F98A5] focus:bg-white"
							required
						/>
					</div>
				</div>

				<div>
					<label for="pass" class="block text-xs font-bold text-[#24313A] mb-1">Kata Sandi</label>
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6F7B7B]">
							<Lock class="h-4 w-4" />
						</div>
						<input
							id="pass"
							type="password"
							bind:value={password}
							placeholder="••••••••"
							class="w-full rounded-lg border border-[#DDE5E0] bg-[#F5F7F5] py-2.5 pl-9 pr-3 text-xs text-[#24313A] placeholder-[#A5AEAA] outline-none transition focus:border-[#5F98A5] focus:bg-white"
							required
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					class="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5F98A5] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#5F98A5]/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
				>
					{#if isLoading}
						<span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
						Memproses...
					{:else}
						Masuk ke NezCom
						<ArrowRight class="h-3.5 w-3.5" />
					{/if}
				</button>
			</form>
		</div>
	</div>
</div>
