<script lang="ts">
	import { onMount } from 'svelte';

	let status = $state<'connected' | 'reconnecting' | 'offline'>('connected');

	onMount(() => {
		const updateStatus = () => {
			status = navigator.onLine ? 'connected' : 'offline';
		};
		window.addEventListener('online', updateStatus);
		window.addEventListener('offline', updateStatus);

		return () => {
			window.removeEventListener('online', updateStatus);
			window.removeEventListener('offline', updateStatus);
		};
	});
</script>

{#if status !== 'connected'}
	<div
		class="flex min-h-8 items-center justify-between border-b px-5 text-[10px] font-semibold transition-all duration-200 {status ===
		'reconnecting'
			? 'border-[#E8D28D]/40 bg-[#E8D28D]/20 text-[#D39A3E]'
			: 'border-[#C96F6F]/30 bg-[#C96F6F]/10 text-[#C96F6F]'}"
	>
		<div class="flex items-center gap-2">
			<span class="inline-block h-1.5 w-1.5 rounded-full {status === 'reconnecting' ? 'bg-[#D39A3E] animate-ping' : 'bg-[#C96F6F]'}"></span>
			<span>{status === 'reconnecting' ? 'Menghubungkan...' : 'Tidak Terhubung'}</span>
		</div>
	</div>
{/if}
