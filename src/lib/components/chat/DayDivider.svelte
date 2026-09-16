<script lang="ts">
	import { formatDateLabel } from '$lib/formatters';

	let { dateISO }: { dateISO?: string } = $props();

	const label = $derived(dateISO ? formatDateLabel(dateISO) : 'Hari Ini');
</script>

<div class="flex items-center justify-center gap-3 py-3">
	<div class="h-px flex-1 bg-[#DDE5E0]"></div>
	<span class="rounded-full bg-[#EEF3F0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">{label}</span>
	<div class="h-px flex-1 bg-[#DDE5E0]"></div>
</div>
