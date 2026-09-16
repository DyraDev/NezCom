<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { initNotifications } from '$lib/notifications';

	let { children } = $props();

	onMount(() => {
		initNotifications();
	});
</script>

<div class="fixed inset-0 w-full h-full overflow-hidden bg-[#F5F7F5] text-[#24313A] flex flex-col font-['DM_Sans',sans-serif]">
	{@render children()}
</div>
