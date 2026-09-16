<script lang="ts">
	let { onSelect }: { onSelect: (emoji: string) => void } = $props();

	const categories = [
		{ label: '😊 Sering', emojis: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤗','🤔','😅','😆','😉','🙂','😇','😋','🤩','😏','😌','🤭'] },
		{ label: '👋 Tangan', emojis: ['👍','👎','👋','🤝','✌️','🤞','🙏','💪','👏','🫶','👌','🤙','✋','🤚','🖐️','☝️','👆','👇','👈','👉'] },
		{ label: '❤️ Hati', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','❣️','💕','💗','💖','💘','💝','🫀','💯','✨','🔥','⭐'] },
		{ label: '🎉 Objek', emojis: ['🎉','🎊','🎁','🎈','📚','📝','✏️','📌','📎','🔔','💡','🕐','📱','💻','🏫','🎓','📋','🗓️','✅','❌'] },
		{ label: '😢 Ekspresi', emojis: ['😢','😭','😤','😡','🤯','😱','😰','🥺','😴','🤒','🤮','😵','🙄','😬','🤐','😈','👻','💀','🤡','😷'] }
	];

	let activeCategory = $state(0);
</script>

<div class="absolute bottom-full left-0 mb-1 w-70 rounded-xl border border-[#DDE5E0] bg-white p-2 shadow-lg z-20">
	<!-- Category Tabs -->
	<div class="flex gap-1 border-b border-[#DDE5E0] pb-1.5 mb-1.5">
		{#each categories as cat, i}
			<button
				type="button"
				onclick={() => (activeCategory = i)}
				class="rounded-md px-1.5 py-0.5 text-[11px] transition cursor-pointer {activeCategory === i ? 'bg-[#8FBBC5]/25 font-bold text-[#24313A]' : 'text-[#6F7B7B] hover:bg-[#EEF3F0]'}"
			>
				{cat.label.split(' ')[0]}
			</button>
		{/each}
	</div>

	<!-- Emoji Grid -->
	<div class="grid grid-cols-10 gap-0.5 max-h-35 overflow-y-auto custom-scrollbar">
		{#each categories[activeCategory].emojis as emoji}
			<button
				type="button"
				onclick={() => onSelect(emoji)}
				class="grid h-7 w-7 place-items-center rounded-md text-base hover:bg-[#EEF3F0] cursor-pointer transition"
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
