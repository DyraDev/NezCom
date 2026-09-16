<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { pb, currentUser } from '$lib/pocketbase';
	import { sendLocalNotification, initNotifications } from '$lib/notifications';
	import { compressImage } from '$lib/imageCompressor';
	import { formatTime, isSameDay } from '$lib/formatters';
	import type { UserRecord, GroupRecord, MessageRecord, ActiveTargetType } from '$lib/types';

	// Modular Components
	import BrandLogo from '$lib/components/brand/BrandLogo.svelte';
	import ConnectionBanner from '$lib/components/connection/ConnectionBanner.svelte';
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import SidebarSearch from '$lib/components/sidebar/SidebarSearch.svelte';
	import BroadcastNavItem from '$lib/components/sidebar/BroadcastNavItem.svelte';
	import GroupNavItem from '$lib/components/sidebar/GroupNavItem.svelte';
	import DirectNavItem from '$lib/components/sidebar/DirectNavItem.svelte';
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import DayDivider from '$lib/components/chat/DayDivider.svelte';
	import MessageBubble from '$lib/components/chat/MessageBubble.svelte';
	import BroadcastCard from '$lib/components/chat/BroadcastCard.svelte';
	import MessageComposer from '$lib/components/chat/MessageComposer.svelte';
	import InfoPanel from '$lib/components/chat/InfoPanel.svelte';
	import TypingIndicator from '$lib/components/chat/TypingIndicator.svelte';
	import CreateGroupModal from '$lib/components/modals/CreateGroupModal.svelte';
	import AdminPanelModal from '$lib/components/modals/AdminPanelModal.svelte';
	import LightboxModal from '$lib/components/modals/LightboxModal.svelte';
	import EmptyChatState from '$lib/components/empty/EmptyChatState.svelte';
	import EmptySelectionState from '$lib/components/empty/EmptySelectionState.svelte';
	import { getAvatarUrl } from '$lib/pocketbase';
	import { isImageFile } from '$lib/formatters';
	import { Pin, X, ArrowDown } from 'lucide-svelte';

	// Active Chat State
	let activeType = $state<ActiveTargetType>('broadcast');
	let activeTarget = $state<any>(null);

	// Data Collections
	let broadcastGroup = $state<GroupRecord | null>(null);
	let myGroups = $state<GroupRecord[]>([]);
	let allUsers = $state<UserRecord[]>([]);
	let messages = $state<MessageRecord[]>([]);
	let groupLastReadMap = $state<Record<string, string>>({});

	// Lightbox, Scroll & Pinned Message State
	let activePreviewImage = $state<string | null>(null);
	let pinnedMessageMap = $state<Record<string, MessageRecord>>({});
	let hasUnreadNewMessage = $state(false);

	const hasSearchResults = $derived.by(() => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		const matchingUsers = sortedUsers.some(u => u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
		const matchingGroups = sortedGroups.some(g => g.name?.toLowerCase().includes(q));
		return matchingUsers || matchingGroups;
	});

	const currentPinnedMessage = $derived(
		activeTarget?.id ? pinnedMessageMap[activeTarget.id] : null
	);

	const canPinCurrentChat = $derived(
		activeType === 'direct' ||
		$currentUser?.role === 'superadmin' ||
		$currentUser?.role === 'teacher' ||
		(activeType === 'group' && activeTarget?.created_by === $currentUser?.id)
	);

	function handlePinMessage(msg: MessageRecord) {
		if (!activeTarget?.id) return;
		if (pinnedMessageMap[activeTarget.id]?.id === msg.id) {
			const copy = { ...pinnedMessageMap };
			delete copy[activeTarget.id];
			pinnedMessageMap = copy;
		} else {
			pinnedMessageMap = { ...pinnedMessageMap, [activeTarget.id]: msg };
		}
	}

	function scrollToMessage(msgId: string) {
		const el = document.getElementById(`msg-${msgId}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	// Form & UI States
	let isSending = $state(false);
	let searchQuery = $state('');
	let chatSearchQuery = $state('');
	let isSidebarOpenMobile = $state(false);
	let showInfoPanel = $state(false);

	// Reply & Typing States
	let replyingToMessage = $state<MessageRecord | null>(null);
	let typingTimeout: ReturnType<typeof setTimeout> | null = null;

	// Modals
	let showCreateGroupModal = $state(false);
	let showAdminModal = $state(false);

	// Broadcast Permission
	let canIStoreBroadcast = $state(false);

	let messagesContainer = $state<HTMLDivElement | null>(null);
	let unsubscribeMessages: (() => void) | null = null;
	let unsubscribePresence: (() => void) | null = null;
	let unsubscribeGroups: (() => void) | null = null;
	let presenceInterval: ReturnType<typeof setInterval> | null = null;

	// ──────────────────────────────────────────────────────────
	// DERIVED STATES
	// ──────────────────────────────────────────────────────────
	const sortedUsers = $derived(
		[...allUsers].sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0))
	);

	const sortedGroups = $derived(
		[...myGroups].sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0))
	);

	const displayedMessages = $derived(
		messages.filter(m => !chatSearchQuery || m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase()))
	);

	// Typing indicator inside active chat window
	const typingUsers = $derived.by(() => {
		if (!activeTarget?.id || !$currentUser?.id) return [];
		if (activeType === 'direct') {
			return allUsers
				.filter(u => u.id === activeTarget.id && u.typing_to === $currentUser.id)
				.map(u => u.name || u.username);
		} else {
			return allUsers
				.filter(u => u.id !== $currentUser.id && u.typing_to === activeTarget.id)
				.map(u => u.name || u.username);
		}
	});

	function getGroupTypingText(groupId: string): string {
		const typers = allUsers.filter(u => u.id !== $currentUser?.id && u.typing_to === groupId);
		if (typers.length === 0) return '';
		if (typers.length === 1) return `${typers[0].name || typers[0].username} mengetik...`;
		return `${typers.length} orang mengetik...`;
	}

	const isCurrentTargetOnline = $derived.by(() => {
		if (!activeTarget) return false;
		if (activeType === 'direct') {
			const u = allUsers.find(user => user.id === activeTarget.id);
			return u ? isUserOnline(u) : isUserOnline(activeTarget);
		} else {
			return allUsers.some(u => u.id !== $currentUser?.id && isUserOnline(u));
		}
	});

	// ──────────────────────────────────────────────────────────
	// LIFECYCLE
	// ──────────────────────────────────────────────────────────
	onMount(async () => {
		if (!pb.authStore.isValid || !$currentUser) {
			goto('/login');
			return;
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', handleBeforeUnload);
		}

		await initNotifications();
		await loadInitialData();
		await checkBroadcastPermission();
		await setupRealtime();
		setupPresence();
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		}
		if (unsubscribeMessages) {
			try { unsubscribeMessages(); } catch (_) {}
		}
		if (unsubscribePresence) {
			try { unsubscribePresence(); } catch (_) {}
		}
		if (unsubscribeGroups) {
			try { unsubscribeGroups(); } catch (_) {}
		}
		if (presenceInterval) {
			clearInterval(presenceInterval);
		}
	});

	function handleBeforeUnload() {
		if ($currentUser?.id) {
			pb.collection('users').update($currentUser.id, { typing_to: '' }).catch(() => {});
		}
	}

	// ──────────────────────────────────────────────────────────
	// PRESENCE & REALTIME SETUP
	// ──────────────────────────────────────────────────────────
	function setupPresence() {
		if (!$currentUser?.id) return;

		updateMyPresence();
		presenceInterval = setInterval(updateMyPresence, 30_000);

		pb.collection('users').subscribe('*', (e) => {
			const record = e.record;
			if ($currentUser?.id && record.id === record.id) {
				if (record.id === $currentUser.id) {
					currentUser.set(record as any);
				}
			}
			allUsers = allUsers.map(u => {
				if (u.id === record.id) {
					return {
						...u,
						name: record.name,
						username: record.username,
						avatar: record.avatar,
						typing_to: record.typing_to,
						online: isUserOnline(record)
					};
				}
				return u;
			});

			if (activeType === 'direct' && activeTarget?.id === record.id) {
				activeTarget = { ...activeTarget, name: record.name, username: record.username, avatar: record.avatar };
			}
		}).then(unsub => {
			unsubscribePresence = unsub;
		}).catch(console.error);
	}

	async function updateMyPresence() {
		if (!$currentUser?.id) return;
		try {
			await pb.collection('users').update($currentUser.id, {
				updated: new Date().toISOString()
			});
		} catch (_) {}
	}

	function isUserOnline(user: any): boolean {
		if (!user?.updated) return false;
		const lastSeen = new Date(user.updated).getTime();
		return (Date.now() - lastSeen) < 60_000;
	}

	// ──────────────────────────────────────────────────────────
	// BROADCAST PERMISSION CHECK
	// ──────────────────────────────────────────────────────────
	async function checkBroadcastPermission() {
		if ($currentUser?.role === 'superadmin') {
			canIStoreBroadcast = true;
			return;
		}
		if ($currentUser?.role === 'teacher') {
			if ($currentUser.can_broadcast) {
				canIStoreBroadcast = true;
				return;
			}
			const setting = await pb.collection('app_settings').getFirstListItem('key="broadcast_policy"').catch(() => null);
			if (setting?.value === 'all_teachers') {
				canIStoreBroadcast = true;
				return;
			}
		}
		canIStoreBroadcast = false;
	}

	// ──────────────────────────────────────────────────────────
	// INITIAL DATA LOAD
	// ──────────────────────────────────────────────────────────
	async function loadInitialData() {
		try {
			// 1. Load Broadcast Group
			broadcastGroup = (await pb.collection('groups').getFirstListItem('type="broadcast"').catch(() => null)) as unknown as GroupRecord;
			if (activeType === 'broadcast' && broadcastGroup) {
				activeTarget = broadcastGroup;
			}

			// 2. Load My Groups & Last Read Tracking
			const memberRecords = await pb.collection('group_members').getFullList({
				filter: `user="${$currentUser?.id}"`,
				expand: 'group'
			});

			const readMap: Record<string, string> = {};
			for (const m of memberRecords) {
				if (m.group && m.last_read_message_id) {
					readMap[m.group] = m.last_read_message_id;
				}
			}
			groupLastReadMap = readMap;

			let userGroups = memberRecords.map(m => m.expand?.group).filter(g => g && g.type !== 'broadcast') as unknown as GroupRecord[];

			if ($currentUser?.role === 'superadmin' || $currentUser?.role === 'teacher') {
				const classGroups = (await pb.collection('groups').getFullList({
					filter: 'type="class"'
				})) as unknown as GroupRecord[];
				const existingIds = new Set(userGroups.map(g => g.id));
				for (const cg of classGroups) {
					if (!existingIds.has(cg.id)) {
						userGroups.push(cg);
					}
				}
			}

			myGroups = userGroups;

			// 3. Load Users for DM
			allUsers = (await pb.collection('users').getFullList({
				filter: `id != "${$currentUser?.id}"`,
				sort: 'name'
			})) as unknown as UserRecord[];

			allUsers = allUsers.map(u => ({ ...u, online: isUserOnline(u) }));

			// 4. Compute Previews
			await computeInitialPreviews();

			if (activeTarget) {
				await loadMessages();
			}
		} catch (err) {
			console.error('Error loading initial data:', err);
		}
	}

	// ──────────────────────────────────────────────────────────
	// COMPUTE PREVIEWS
	// ──────────────────────────────────────────────────────────
	async function computeInitialPreviews() {
		if (!$currentUser?.id) return;

		try {
			const recentMsgs = (await pb.collection('messages').getFullList({
				sort: 'created',
				expand: 'sender'
			})) as unknown as MessageRecord[];

			// 1. Update Users (1:1 DMs)
			allUsers = allUsers.map(u => {
				const dmMessages = recentMsgs.filter(
					m => (m.sender === u.id && m.receiver === $currentUser?.id) || (m.sender === $currentUser?.id && m.receiver === u.id)
				);
				const lastMsg = dmMessages[dmMessages.length - 1];
				const unread = dmMessages.filter(m => m.sender === u.id && !m.read_at).length;
				const ts = lastMsg ? new Date(lastMsg.created).getTime() : 0;

				return {
					...u,
					lastMessage: lastMsg ? (lastMsg.content || (lastMsg.attachments?.length ? '📷 [Lampiran]' : '')) : undefined,
					lastMessageSenderId: lastMsg?.sender,
					lastTime: lastMsg ? formatTime(lastMsg.created) : undefined,
					lastTimestamp: ts,
					unreadCount: unread
				};
			});

			// 2. Update Groups
			myGroups = myGroups.map(g => {
				const groupMsgs = recentMsgs.filter(m => m.group === g.id);
				const lastMsg = groupMsgs[groupMsgs.length - 1];
				const lastReadId = groupLastReadMap[g.id];

				let unread = 0;
				if (lastReadId) {
					const readIndex = groupMsgs.findIndex(m => m.id === lastReadId);
					if (readIndex !== -1) {
						unread = groupMsgs.slice(readIndex + 1).filter(m => m.sender !== $currentUser?.id).length;
					}
				} else {
					unread = 0;
				}

				const ts = lastMsg ? new Date(lastMsg.created).getTime() : 0;

				return {
					...g,
					lastMessage: lastMsg ? (lastMsg.content || (lastMsg.attachments?.length ? '📷 [Lampiran]' : '')) : undefined,
					lastMessageSenderId: lastMsg?.sender,
					lastTime: lastMsg ? formatTime(lastMsg.created) : undefined,
					lastTimestamp: ts,
					unreadCount: unread
				};
			});

			// 3. Update Broadcast Group
			if (broadcastGroup) {
				const bgId = broadcastGroup.id;
				const bMsgs = recentMsgs.filter(m => m.group === bgId);
				const lastMsg = bMsgs[bMsgs.length - 1];
				const lastReadId = groupLastReadMap[bgId];

				let unread = 0;
				if (lastReadId) {
					const readIndex = bMsgs.findIndex(m => m.id === lastReadId);
					if (readIndex !== -1) {
						unread = bMsgs.slice(readIndex + 1).filter(m => m.sender !== $currentUser?.id).length;
					}
				}

				const ts = lastMsg ? new Date(lastMsg.created).getTime() : 0;

				broadcastGroup = {
					...broadcastGroup,
					lastMessage: lastMsg ? lastMsg.content : undefined,
					lastMessageSenderId: lastMsg?.sender,
					lastTime: lastMsg ? formatTime(lastMsg.created) : undefined,
					lastTimestamp: ts,
					unreadCount: unread
				};
			}
		} catch (err) {
			console.error('Error computing initial previews:', err);
		}
	}

	// ──────────────────────────────────────────────────────────
	// UPDATE SINGLE CONTACT PREVIEW
	// ──────────────────────────────────────────────────────────
	function updatePreviewFromMessage(record: MessageRecord) {
		if (!$currentUser?.id) return;

		const previewText = record.content || (record.attachments?.length ? '📷 [Lampiran]' : '');
		const previewTime = formatTime(record.created);
		const ts = new Date(record.created).getTime();
		const senderId = record.sender;

		if (record.group) {
			if (broadcastGroup && record.group === broadcastGroup.id) {
				const isCurrent = activeType === 'broadcast';
				broadcastGroup = {
					...broadcastGroup,
					lastMessage: previewText,
					lastMessageSenderId: senderId,
					lastTime: previewTime,
					lastTimestamp: ts,
					unreadCount: (isCurrent ? 0 : (broadcastGroup.unreadCount || 0) + (senderId !== $currentUser.id ? 1 : 0))
				};
			} else {
				myGroups = myGroups.map(g => {
					if (g.id === record.group) {
						const isCurrent = activeType === 'group' && activeTarget?.id === g.id;
						return {
							...g,
							lastMessage: previewText,
							lastMessageSenderId: senderId,
							lastTime: previewTime,
							lastTimestamp: ts,
							unreadCount: (isCurrent ? 0 : (g.unreadCount || 0) + (senderId !== $currentUser?.id ? 1 : 0))
						};
					}
					return g;
				});
			}
		} else if (record.receiver) {
			const otherUserId = record.sender === $currentUser.id ? record.receiver : record.sender;
			allUsers = allUsers.map(u => {
				if (u.id === otherUserId) {
					const isCurrent = activeType === 'direct' && activeTarget?.id === otherUserId;
					return {
						...u,
						lastMessage: previewText,
						lastMessageSenderId: senderId,
						lastTime: previewTime,
						lastTimestamp: ts,
						unreadCount: (isCurrent ? 0 : (u.unreadCount || 0) + (senderId !== $currentUser?.id ? 1 : 0))
					};
				}
				return u;
			});
		}
	}

	// ──────────────────────────────────────────────────────────
	// SELECT TARGET
	// ──────────────────────────────────────────────────────────
	async function selectTarget(type: ActiveTargetType, target: any) {
		activeType = type;
		activeTarget = target;
		isSidebarOpenMobile = false;
		chatSearchQuery = '';
		replyingToMessage = null;

		if (type === 'direct') {
			allUsers = allUsers.map(u => (u.id === target.id ? { ...u, unreadCount: 0 } : u));
		} else if (type === 'group') {
			myGroups = myGroups.map(g => (g.id === target.id ? { ...g, unreadCount: 0 } : g));
		} else if (type === 'broadcast' && broadcastGroup) {
			broadcastGroup = { ...broadcastGroup, unreadCount: 0 };
		}

		await loadMessages();
	}

	// ──────────────────────────────────────────────────────────
	// LOAD MESSAGES
	// ──────────────────────────────────────────────────────────
	async function loadMessages() {
		if (!activeTarget || !activeTarget.id) return;

		let filter = '';
		if (activeType === 'broadcast' || activeType === 'group') {
			filter = `group="${activeTarget.id}"`;
		} else if (activeType === 'direct') {
			if (!$currentUser?.id) return;
			filter = `(sender="${$currentUser.id}" && receiver="${activeTarget.id}") || (sender="${activeTarget.id}" && receiver="${$currentUser.id}")`;
		}

		try {
			const res = (await pb.collection('messages').getFullList({
				filter,
				sort: 'created',
				expand: 'sender'
			})) as unknown as MessageRecord[];

			const messageMap = new Map(res.map(m => [m.id, m]));
			messages = res.map(m => {
				if (m.reply_to && messageMap.has(m.reply_to)) {
					const quoted = messageMap.get(m.reply_to)!;
					const senderName = quoted.expand?.sender?.name || quoted.expand?.sender?.username || 'Pengguna';
					return {
						...m,
						replyPreview: {
							senderName,
							content: quoted.content || '[Lampiran]'
						}
					};
				}
				return m;
			});

			await scrollToBottom();

			// Mark messages read for DM
			if (activeType === 'direct') {
				const unread = messages.filter(m => m.sender === activeTarget.id && !m.read_at);
				if (unread.length > 0) {
					const now = new Date().toISOString();
					Promise.all(unread.map(m => pb.collection('messages').update(m.id, { read_at: now }))).catch(console.error);
				}
			} else if ((activeType === 'group' || activeType === 'broadcast') && messages.length > 0) {
				const lastMsg = messages[messages.length - 1];
				groupLastReadMap = { ...groupLastReadMap, [activeTarget.id]: lastMsg.id };

				pb.collection('group_members').getFullList({
					filter: `group="${activeTarget.id}" && user="${$currentUser?.id}"`
				}).then(async (mems) => {
					if (mems[0]) {
						pb.collection('group_members').update(mems[0].id, { last_read_message_id: lastMsg.id }).catch(() => {});
					} else if ($currentUser?.id) {
						pb.collection('group_members').create({
							group: activeTarget.id,
							user: $currentUser.id,
							last_read_message_id: lastMsg.id,
							joined_at: new Date().toISOString()
						}).catch(() => {});
					}
				}).catch(() => {});
			}
		} catch (err) {
			console.error('Error loading messages:', err);
		}
	}

	// ──────────────────────────────────────────────────────────
	// REALTIME SUBSCRIPTIONS (MESSAGES & GROUPS)
	// ──────────────────────────────────────────────────────────
	async function setupRealtime() {
		if (unsubscribeMessages) {
			try { unsubscribeMessages(); } catch (_) {}
			unsubscribeMessages = null;
		}
		if (unsubscribeGroups) {
			try { unsubscribeGroups(); } catch (_) {}
			unsubscribeGroups = null;
		}

		try {
			// 1. Messages Realtime
			unsubscribeMessages = await pb.collection('messages').subscribe('*', async (e) => {
				const { action, record } = e;
				if (action === 'create') {
					const expanded = (await pb.collection('messages').getOne(record.id, { expand: 'sender' }).catch(() => record)) as unknown as MessageRecord;

					if (expanded.reply_to) {
						const quoted = messages.find(m => m.id === expanded.reply_to) || await pb.collection('messages').getOne(expanded.reply_to, { expand: 'sender' }).catch(() => null);
						if (quoted) {
							expanded.replyPreview = {
								senderName: (quoted as any).expand?.sender?.name || (quoted as any).expand?.sender?.username || 'Pengguna',
								content: quoted.content || '[Lampiran]'
							};
						}
					}

					let isCurrentChat = false;
					if ((activeType === 'broadcast' || activeType === 'group') && record.group === activeTarget?.id) {
						isCurrentChat = true;
					} else if (
						activeType === 'direct' &&
						((record.sender === $currentUser?.id && record.receiver === activeTarget?.id) ||
							(record.sender === activeTarget?.id && record.receiver === $currentUser?.id))
					) {
						isCurrentChat = true;
					}

					if (isCurrentChat) {
						if (!messages.some(m => m.id === expanded.id)) {
							messages = [...messages, expanded];
							const isMine = record.sender === $currentUser?.id;
							await scrollToBottom(isMine);
						}

						if (activeType === 'direct' && record.sender === activeTarget?.id) {
							pb.collection('messages').update(record.id, { read_at: new Date().toISOString() }).catch(console.error);
						}
					}

					updatePreviewFromMessage(expanded);

					if (record.sender !== $currentUser?.id) {
						const sender = expanded.expand?.sender;
						const senderName = sender?.name || sender?.username || 'Seseorang';
						const senderAvatar = getAvatarUrl(sender);

						let imagePreviewUrl: string | undefined = undefined;
						if (expanded.attachments && expanded.attachments.length > 0) {
							const firstAtt = expanded.attachments[0];
							if (isImageFile(firstAtt)) {
								imagePreviewUrl = pb.files.getUrl(expanded, firstAtt);
							}
						}

						// 1. Rich OS Notification (Avatar + Image Preview)
						sendLocalNotification(
							`Pesan baru dari ${senderName}`,
							record.content || (imagePreviewUrl ? '📷 [Lampiran Foto]' : '📄 [Lampiran File]'),
							{
								icon: senderAvatar,
								image: imagePreviewUrl,
								isActiveChat: isCurrentChat
							}
						);
					}
				} else if (action === 'update') {
					messages = messages.map(m => (m.id === record.id ? { ...m, ...record } : m));
				} else if (action === 'delete') {
					messages = messages.filter(m => m.id !== record.id);
				}
			});

			// 2. Groups Realtime (REAL-TIME AVATAR, NAME & GROUP CREATION / DELETION)
			unsubscribeGroups = await pb.collection('groups').subscribe('*', (e) => {
				const { action, record } = e;
				if (action === 'update') {
					myGroups = myGroups.map(g => (g.id === record.id ? { ...g, ...record } : g));
					if (broadcastGroup?.id === record.id) {
						broadcastGroup = { ...broadcastGroup, ...record };
					}
					if (activeTarget?.id === record.id) {
						activeTarget = { ...activeTarget, ...record };
					}
				} else if (action === 'create') {
					loadInitialData();
				} else if (action === 'delete') {
					myGroups = myGroups.filter(g => g.id !== record.id);
					if (activeTarget?.id === record.id && broadcastGroup) {
						selectTarget('broadcast', broadcastGroup);
					}
				}
			});
		} catch (err) {
			console.error('Realtime subscription error:', err);
		}
	}

	// ──────────────────────────────────────────────────────────
	// TYPING INDICATOR EVENT
	// ──────────────────────────────────────────────────────────
	function handleUserTyping() {
		if (!$currentUser?.id || !activeTarget?.id) return;

		pb.collection('users').update($currentUser.id, { typing_to: activeTarget.id }).catch(() => {});

		if (typingTimeout) clearTimeout(typingTimeout);
		typingTimeout = setTimeout(() => {
			if ($currentUser?.id) {
				pb.collection('users').update($currentUser.id, { typing_to: '' }).catch(() => {});
			}
		}, 3000);
	}

	// ──────────────────────────────────────────────────────────
	// DELETE MESSAGE
	// ──────────────────────────────────────────────────────────
	async function handleDeleteMessage(msg: MessageRecord) {
		if (!msg.id) return;
		if (confirm('Apakah kamu yakin ingin menghapus pesan ini?')) {
			try {
				await pb.collection('messages').delete(msg.id);
				messages = messages.filter(m => m.id !== msg.id);
			} catch (err: any) {
				alert('Gagal menghapus pesan: ' + (err?.message || 'Error'));
			}
		}
	}

	// ──────────────────────────────────────────────────────────
	// SMART SCROLL CONTROL
	// ──────────────────────────────────────────────────────────
	function isNearBottom(): boolean {
		if (!messagesContainer) return true;
		const threshold = 180;
		const position = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
		return position <= threshold;
	}

	function handleContainerScroll() {
		if (isNearBottom()) {
			hasUnreadNewMessage = false;
		}
	}

	async function scrollToBottom(force = false) {
		await tick();
		if (!messagesContainer) return;
		if (force || isNearBottom()) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
			hasUnreadNewMessage = false;
		} else {
			hasUnreadNewMessage = true;
		}
	}

	async function handleSendMessage(inputText: string, files: File[]) {
		if ((!inputText && files.length === 0) || !activeTarget || isSending) return;

		isSending = true;
		try {
			const formData = new FormData();
			formData.append('sender', $currentUser?.id || '');
			formData.append('content', inputText);

			if (replyingToMessage) {
				formData.append('reply_to', replyingToMessage.id);
			}

			if (activeType === 'broadcast' || activeType === 'group') {
				formData.append('group', activeTarget.id);
			} else if (activeType === 'direct') {
				formData.append('receiver', activeTarget.id);
			}

			for (const file of files) {
				const processed = await compressImage(file);
				formData.append('attachments', processed);
			}

			await pb.collection('messages').create(formData);
			replyingToMessage = null;

			if ($currentUser?.id) {
				pb.collection('users').update($currentUser.id, { typing_to: '' }).catch(() => {});
			}
		} catch (err: any) {
			console.error('Failed to send message:', err);
			alert('Gagal mengirim pesan: ' + (err?.message || 'Error'));
		} finally {
			isSending = false;
		}
	}
</script>

<div class="relative flex h-full w-full overflow-hidden bg-[#F5F7F5]">
	<!-- Mobile Sidebar Overlay -->
	{#if isSidebarOpenMobile}
		<button
			type="button"
			onclick={() => (isSidebarOpenMobile = false)}
			class="fixed inset-0 z-40 bg-[#24313A]/40 backdrop-blur-xs md:hidden border-0 cursor-default"
			aria-label="Tutup Sidebar"
		></button>
	{/if}

	<!-- 1. LEFT SIDEBAR (290px) -->
	<aside
		class="fixed inset-y-0 left-0 z-50 flex w-72.5 flex-col border-r border-[#DDE5E0] bg-white transition-transform duration-200 md:static md:translate-x-0 {isSidebarOpenMobile ? 'translate-x-0' : '-translate-x-full'}"
	>
		<div class="flex h-18 items-center border-b border-[#DDE5E0] px-5">
			<BrandLogo size="md" />
		</div>

		<SidebarSearch bind:value={searchQuery} />

		<div class="flex-1 overflow-y-auto px-2.5 py-2 space-y-4 custom-scrollbar">
			<!-- 💬 CHAT SECTION -->
			<div>
				<div class="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Chat</div>
				<div class="space-y-0.5">
					{#each sortedUsers as u (u.id)}
						{#if !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.username?.toLowerCase().includes(searchQuery.toLowerCase())}
							<DirectNavItem
								user={u}
								isActive={activeType === 'direct' && activeTarget?.id === u.id}
								onClick={() => selectTarget('direct', u)}
							/>
						{/if}
					{/each}
				</div>
			</div>

			<!-- 👥 GROUP SECTION -->
			<div>
				<div class="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Grup</div>
				<div class="space-y-0.5">
					{#each sortedGroups as g (g.id)}
						{#if !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase())}
							<GroupNavItem
								group={g}
								isActive={activeType === 'group' && activeTarget?.id === g.id}
								unreadCount={g.unreadCount || 0}
								typingText={getGroupTypingText(g.id)}
								onClick={() => selectTarget('group', g)}
							/>
						{/if}
					{:else}
						<div class="px-2.5 py-1 text-xs text-[#A5AEAA] italic">Belum ada grup.</div>
					{/each}
				</div>
			</div>

			<!-- 📢 INFORMASI / BROADCAST SECTION -->
			<div>
				<div class="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6F7B7B]">Informasi</div>
				{#if broadcastGroup}
					<BroadcastNavItem
						isActive={activeType === 'broadcast'}
						unreadCount={broadcastGroup.unreadCount || 0}
						onClick={() => selectTarget('broadcast', broadcastGroup)}
					/>
				{/if}
			</div>

			{#if searchQuery && !hasSearchResults}
				<div class="px-3 py-6 text-center text-xs text-[#A5AEAA] italic">
					Kontak atau grup tidak ditemukan
				</div>
			{/if}
		</div>

		<SidebarHeader
			user={$currentUser as unknown as UserRecord}
			onOpenAdminModal={() => (showAdminModal = true)}
			onOpenCreateGroupModal={() => (showCreateGroupModal = true)}
		/>
	</aside>

	<!-- 2. MAIN CHAT AREA -->
	<main class="flex flex-1 flex-col h-full bg-[#F5F7F5] overflow-hidden min-w-0">
		<ConnectionBanner />

		{#if activeTarget}
			<ChatHeader
				type={activeType}
				target={activeTarget}
				onOpenMobileSidebar={() => (isSidebarOpenMobile = true)}
				onToggleInfoPanel={() => (showInfoPanel = !showInfoPanel)}
				onSearchChange={(q) => (chatSearchQuery = q)}
			/>

			<!-- Pinned Message Bar -->
			{#if currentPinnedMessage}
				<div class="flex items-center justify-between border-b border-[#DDE5E0] bg-white px-4 py-2 text-xs shadow-2xs">
					<button
						type="button"
						onclick={() => scrollToMessage(currentPinnedMessage.id)}
						class="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer hover:opacity-80 transition"
					>
						<Pin class="h-3.5 w-3.5 text-[#5F98A5] shrink-0" />
						<span class="font-bold text-[#5F98A5] shrink-0">Sematkan:</span>
						<span class="truncate text-[#24313A]">{currentPinnedMessage.content || '[Lampiran]'}</span
						>
					</button>
					{#if canPinCurrentChat}
						<button
							type="button"
							onclick={() => handlePinMessage(currentPinnedMessage)}
							title="Lepas Sematan"
							class="text-[#6F7B7B] hover:text-[#C96F6F] p-1 rounded-md cursor-pointer transition"
						>
							<X class="h-3.5 w-3.5" />
						</button>
					{/if}
				</div>
			{/if}

			<!-- Messages Scroll Container Container -->
			<div class="relative flex-1 min-h-0 flex flex-col">
				<div bind:this={messagesContainer} onscroll={handleContainerScroll} class="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
					{#each displayedMessages as msg, index (msg.id)}
						<!-- Smart Day Divider -->
						{#if index === 0 || !isSameDay(displayedMessages[index - 1]?.created, msg.created)}
							<DayDivider dateISO={msg.created} />
						{/if}

						{#if activeType === 'broadcast'}
							<BroadcastCard {msg} />
						{:else}
							<MessageBubble
								{msg}
								isTargetOnline={isCurrentTargetOnline}
								showSender={activeType === 'group'}
								onReply={(m) => (replyingToMessage = m)}
								onDelete={handleDeleteMessage}
								onSelectUser={(u) => selectTarget('direct', u)}
								onPreviewImage={(url) => (activePreviewImage = url)}
								onPinMessage={canPinCurrentChat ? handlePinMessage : undefined}
							/>
						{/if}
					{:else}
						<EmptyChatState isGroup={activeType === 'group'} />
					{/each}

					<!-- Typing Indicator inside active chat window -->
					{#if typingUsers.length > 0}
						<TypingIndicator names={typingUsers} />
					{/if}
				</div>

				<!-- Floating Unread New Message Button -->
				{#if hasUnreadNewMessage}
					<button
						type="button"
						onclick={() => scrollToBottom(true)}
						class="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 rounded-full bg-[#5F98A5] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#5F98A5]/90 animate-bounce cursor-pointer"
					>
						<ArrowDown class="h-3.5 w-3.5" />
						<span>Pesan Baru</span>
					</button>
				{/if}
			</div>

			<!-- Message Composer -->
			<MessageComposer
				canSend={activeType !== 'broadcast' || canIStoreBroadcast}
				{isSending}
				replyTo={replyingToMessage}
				disabledReason="Hanya Superadmin & Guru ter-whitelist yang dapat mengirim broadcast pengumuman."
				onSend={handleSendMessage}
				onTyping={handleUserTyping}
				onCancelReply={() => (replyingToMessage = null)}
			/>
		{:else}
			<EmptySelectionState />
		{/if}
	</main>

	<!-- 3. RIGHT INFO PANEL -->
	{#if activeTarget && showInfoPanel}
		<InfoPanel
			type={activeType}
			target={activeTarget}
			{messages}
			onClose={() => (showInfoPanel = false)}
			onSelectUser={(u) => selectTarget('direct', u)}
			onPreviewImage={(url) => (activePreviewImage = url)}
			onGroupDeleted={() => {
				showInfoPanel = false;
				loadInitialData();
				if (broadcastGroup) selectTarget('broadcast', broadcastGroup);
			}}
		/>
	{/if}
</div>

<!-- Modals -->
<CreateGroupModal bind:isOpen={showCreateGroupModal} onGroupCreated={loadInitialData} />
<AdminPanelModal bind:isOpen={showAdminModal} onUsersUpdated={loadInitialData} />
<LightboxModal imageUrl={activePreviewImage} onClose={() => (activePreviewImage = null)} />
