import { CHAT_WS_URL } from '../config/api';
import { MessageDto, MessageStatus, MessageType } from './chatApi';

type MessageListener = (message: MessageDto) => void;
type StatusListener = (update: { messageId: string; status: MessageStatus; userId?: string; roomId?: string }) => void;
type TypingListener = (event: { roomId: string; userId: string; userName: string; isTyping: boolean }) => void;
type AiTypingListener = (event: { roomId: string; isTyping: boolean }) => void;

export interface SosAlertPayload {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  phoneNumber?: string;
  bikeInfo?: string;
  description?: string;
  createdAt?: string;
}
type SosListener = (sos: SosAlertPayload) => void;

class ChatWebSocketService {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private typingListeners = new Set<TypingListener>();
  private aiTypingListeners = new Set<AiTypingListener>();
  private sosListeners = new Set<SosListener>();

  public connect(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      const urlWithUser = `${CHAT_WS_URL}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName || 'Rider')}`;
      console.log('[ChatWs] Connecting to:', urlWithUser);
      this.ws = new WebSocket(urlWithUser);

      this.ws.onopen = () => {
        console.log('[ChatWs] Connected successfully for user:', userId);
        this.isConnecting = false;
        this.startHeartbeat();

        // Register user identity with backend so all room messages and pushes arrive in real time
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'IDENTIFY',
              userId: this.userId,
              userName: this.userName,
            })
          );
        }

        // If we were in a room, re-join
        if (this.currentRoomId) {
          this.joinRoom(this.currentRoomId, this.userId || '', this.userName || 'Rider');
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (e) {
          console.warn('[ChatWs] Error parsing message packet:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.log('[ChatWs] Connection error (service may be starting):', (e as any)?.message || 'WS error');
      };

      this.ws.onclose = () => {
        console.log('[ChatWs] Connection closed, scheduling reconnect...');
        this.cleanup();
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('[ChatWs] Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.userName) {
        this.connect(this.userId, this.userName);
      }
    }, 4000);
  }

  private cleanup() {
    this.isConnecting = false;
    this.stopHeartbeat();
  }

  private handlePacket(packet: any) {
    if (!packet || !packet.type) return;

    switch (packet.type) {
      case 'NEW_MESSAGE':
        if (packet.message) {
          this.messageListeners.forEach((fn) => fn(packet.message));
        }
        break;

      case 'MESSAGE_STATUS_UPDATE':
        this.statusListeners.forEach((fn) =>
          fn({
            messageId: packet.messageId,
            status: packet.status,
            userId: packet.userId,
            roomId: packet.roomId,
          })
        );
        break;

      case 'USER_TYPING':
        this.typingListeners.forEach((fn) =>
          fn({
            roomId: packet.roomId,
            userId: packet.userId,
            userName: packet.userName,
            isTyping: packet.isTyping,
          })
        );
        break;

      case 'AI_TYPING':
        this.aiTypingListeners.forEach((fn) =>
          fn({
            roomId: packet.roomId,
            isTyping: packet.isTyping,
          })
        );
        break;

      case 'SOS_ALERT':
        if (packet.sos) {
          this.sosListeners.forEach((fn) => fn(packet.sos));
        }
        break;

      case 'PONG':
        // Alive ack
        break;
    }
  }

  public joinRoom(roomId: string, userId: string, userName: string) {
    this.currentRoomId = roomId;
    this.userId = userId;
    this.userName = userName;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomId,
          userId,
          userName,
        })
      );
    } else {
      this.connect(userId, userName);
    }
  }

  public leaveRoom(roomId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'LEAVE_ROOM',
          roomId,
        })
      );
    }
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
    }
  }

  public sendMessage(payload: {
    roomId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    msgType?: MessageType;
    mediaUrl?: string;
    metadataJson?: string;
  }) {
    const packet = {
      type: 'SEND_MESSAGE',
      roomId: payload.roomId,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      content: payload.content,
      msgType: payload.msgType || 'TEXT',
      mediaUrl: payload.mediaUrl,
      metadataJson: payload.metadataJson,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    } else {
      console.warn('[ChatWs] WebSocket not ready, sending via REST or queuing');
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public sendStatusUpdate(messageId: string, roomId: string, status: MessageStatus, userId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'MESSAGE_STATUS',
          messageId,
          roomId,
          status,
          userId,
        })
      );
    }
  }

  public sendTyping(roomId: string, userId: string, userName: string, isTyping: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'TYPING',
          roomId,
          userId,
          userName,
          isTyping,
        })
      );
    }
  }

  public addMessageListener(fn: MessageListener) {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  public addStatusListener(fn: StatusListener) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  public addTypingListener(fn: TypingListener) {
    this.typingListeners.add(fn);
    return () => this.typingListeners.delete(fn);
  }

  public addAiTypingListener(fn: AiTypingListener) {
    this.aiTypingListeners.add(fn);
    return () => this.aiTypingListeners.delete(fn);
  }

  public addSosListener(fn: SosListener) {
    this.sosListeners.add(fn);
    return () => this.sosListeners.delete(fn);
  }

  public disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const chatWs = new ChatWebSocketService();
