export type UserRole = 'superadmin' | 'teacher' | 'student';

export interface UserRecord {
  id: string;
  username: string;
  name?: string;
  email: string;
  role: UserRole;
  class_name?: string;
  can_broadcast?: boolean;
  avatar?: string;
  typing_to?: string;
  created?: string;
  updated?: string;
  // Dynamic UI properties
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastTime?: string;
  lastTimestamp?: number;
  unreadCount?: number;
  online?: boolean;
}

export type GroupType = 'class' | 'custom' | 'broadcast';

export interface GroupRecord {
  id: string;
  name: string;
  type: GroupType;
  class_name_ref?: string;
  created_by?: string;
  avatar?: string;
  created?: string;
  // Dynamic UI properties
  memberCount?: number;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastTime?: string;
  lastTimestamp?: number;
  unreadCount?: number;
}

export interface GroupMemberRecord {
  id: string;
  group: string;
  user: string;
  last_read_message_id?: string;
  joined_at?: string;
  expand?: {
    user?: UserRecord;
    group?: GroupRecord;
  };
}

export interface MessageRecord {
  id: string;
  sender: string;
  receiver?: string;
  group?: string;
  content?: string;
  attachments?: string[];
  read_at?: string;
  reply_to?: string;
  created: string;
  expand?: {
    sender?: UserRecord;
    receiver?: UserRecord;
    group?: GroupRecord;
  };
  // Local-only: populated client-side for reply preview
  replyPreview?: {
    senderName: string;
    content: string;
  };
}

export interface BlockRecord {
  id: string;
  user: string;
  blocked_user: string;
  reason?: string;
  created?: string;
}

export interface AppSettingRecord {
  id: string;
  key: string;
  value: string;
}

export type ActiveTargetType = 'broadcast' | 'group' | 'direct';
