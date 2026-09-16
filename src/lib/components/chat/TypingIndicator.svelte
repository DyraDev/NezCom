<script lang="ts">
	let { names = [] }: { names: string[] } = $props();

	const label = $derived(
		names.length === 1
			? `${names[0]} sedang mengetik`
			: names.length === 2
				? `${names[0]} dan ${names[1]} sedang mengetik`
				: names.length > 2
					? `${names[0]} dan ${names.length - 1} lainnya sedang mengetik`
					: ''
	);
</script>

{#if names.length > 0}
	<div class="flex items-center gap-2 px-6 py-1.5 text-xs text-[#6F7B7B]">
		<span class="flex gap-0.5">
			<span class="inline-block h-1.5 w-1.5 rounded-full bg-[#5F98A5] animate-bounce" style="animation-delay: 0ms"></span>
			<span class="inline-block h-1.5 w-1.5 rounded-full bg-[#5F98A5] animate-bounce" style="animation-delay: 150ms"></span>
			<span class="inline-block h-1.5 w-1.5 rounded-full bg-[#5F98A5] animate-bounce" style="animation-delay: 300ms"></span>
		</span>
		<span class="italic">{label}...</span>
	</div>
{/if}
