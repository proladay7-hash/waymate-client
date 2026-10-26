import { API_BASE_URL } from '../config/api';

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'LOCATION' | 'TRIP' | 'AI_RESPONSE';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface LocationMetadata {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

export interface TripMetadata {
  tripId: string;
  title: string;
  distanceKm?: number;
  duration?: string;
  coverImage?: string;
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  metadataJson?: string;
  status: MessageStatus;
  createdAt: string;
  readByUserIds?: string[];
}

export interface ChatRoomDto {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP';
  avatar?: string;
  createdById?: string;
  lastMessageContent?: string;
  lastMessageSender?: string;
  lastMessageTime?: string;
  memberIds: string[];
  unreadCount?: number;
}

const INITIAL_DEMO_ROOMS: ChatRoomDto[] = [];
const INITIAL_DEMO_MESSAGES: Record<string, MessageDto[]> = {};

let localRooms: ChatRoomDto[] = [];
let localMessages: Record<string, MessageDto[]> = {};

/**
 * Fetch all rooms for user.
 */
export async function fetchUserRooms(userId: string): Promise<ChatRoomDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms?userId=${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.log('[ChatApi] Backend offline, using local store');
  }
  return localRooms;
}

export const fetchUserChatRooms = fetchUserRooms;

export function markLocalRoomRead(roomId: string) {
  const r = localRooms.find((x) => x.id === roomId);
  if (r) {
    r.unreadCount = 0;
  }
  if (localMessages[roomId]) {
    localMessages[roomId].forEach((m) => {
      m.status = 'READ';
    });
  }
}

export function incrementLocalRoomUnread(roomId: string, lastContent: string, lastSender: string) {
  const r = localRooms.find((x) => x.id === roomId);
  if (r) {
    r.unreadCount = (r.unreadCount || 0) + 1;
    r.lastMessageContent = lastContent;
    r.lastMessageSender = lastSender;
    r.lastMessageTime = new Date().toISOString();
  }
}

export async function fetchTotalUnreadChatCountApi(userId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/unread-count?userId=${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.unreadCount === 'number') {
        return data.unreadCount;
      }
    }
  } catch (e) {
    // Fallback to room summation
  }

  const rooms = await fetchUserRooms(userId);
  return rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
}

/**
 * Get or create direct 1-on-1 chat room.
 */
export async function getOrCreateDirectRoom(
  currentUserId: string,
  otherUserId: string,
  otherUserName?: string,
  otherUserAvatar?: string
): Promise<ChatRoomDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUserId, otherUserId }),
    });
    if (res.ok) {
      const room: ChatRoomDto = await res.json();
      if (otherUserName && (!room.name || room.name === 'Rider' || room.name === 'DIRECT')) {
        room.name = otherUserName;
      }
      if (otherUserAvatar && !room.avatar) {
        room.avatar = otherUserAvatar;
      }
      return room;
    }
  } catch (e) {
    console.log('[ChatApi] Fallback direct room creation');
  }

  // Local fallback
  const existing = localRooms.find(
    (r) => r.type === 'DIRECT' && r.memberIds.includes(currentUserId) && r.memberIds.includes(otherUserId)
  );
  if (existing) {
    if (otherUserName && (!existing.name || existing.name === 'Rider' || existing.name === 'Rider Chat')) {
      existing.name = otherUserName;
    }
    if (otherUserAvatar && !existing.avatar) {
      existing.avatar = otherUserAvatar;
    }
    return existing;
  }

  const newRoom: ChatRoomDto = {
    id: 'room_direct_' + Date.now(),
    name: otherUserName || 'Rider Chat',
    type: 'DIRECT',
    avatar: otherUserAvatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    memberIds: [currentUserId, otherUserId],
    lastMessageContent: 'Started a new conversation',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
  };
  localRooms.unshift(newRoom);
  return newRoom;
}

/**
 * Create a new group chat room.
 */
export async function createGroupRoomApi(
  creatorId: string,
  name: string,
  avatar?: string,
  memberIds: string[] = []
): Promise<ChatRoomDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId, name, avatar, memberIds }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[ChatApi] Fallback group creation');
  }

  const newGroup: ChatRoomDto = {
    id: 'room_group_' + Date.now(),
    name: name || 'Riders Group',
    type: 'GROUP',
    avatar: avatar || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
    createdById: creatorId,
    memberIds: Array.from(new Set([creatorId, ...memberIds])),
    lastMessageContent: 'Group chat created 🎉',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
  };
  localRooms.unshift(newGroup);
  return newGroup;
}

/**
 * Add members to group room.
 */
export async function addMembersToGroupApi(roomId: string, memberIds: string[]): Promise<ChatRoomDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms/${roomId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[ChatApi] Fallback add members');
  }

  const room = localRooms.find((r) => r.id === roomId);
  if (room) {
    room.memberIds = Array.from(new Set([...room.memberIds, ...memberIds]));
    return room;
  }
  throw new Error('Room not found');
}

/**
 * Fetch messages for a room.
 */
export async function fetchRoomMessages(roomId: string): Promise<MessageDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms/${roomId}/messages`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {
    console.log('[ChatApi] Fallback fetch messages');
  }

  return localMessages[roomId] || [];
}

/**
 * Send message via REST API (fallback if WS is reconnecting).
 */
export async function sendMessageApi(payload: {
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  metadataJson?: string;
}): Promise<MessageDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/chat/rooms/${payload.roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[ChatApi] Fallback local send message');
  }

  const localMsg: MessageDto = {
    id: 'msg_' + Date.now(),
    roomId: payload.roomId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderAvatar: payload.senderAvatar,
    content: payload.content,
    type: payload.type || 'TEXT',
    mediaUrl: payload.mediaUrl,
    metadataJson: payload.metadataJson,
    status: 'SENT',
    createdAt: new Date().toISOString(),
  };

  if (!localMessages[payload.roomId]) {
    localMessages[payload.roomId] = [];
  }
  localMessages[payload.roomId].push(localMsg);
  return localMsg;
}

/**
 * Update message status (DELIVERED or READ).
 */
export async function updateMessageStatusApi(
  messageId: string,
  status: MessageStatus,
  userId?: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/chat/messages/${messageId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status }),
    });
  } catch (e) {
    // Offline status update
  }
}
