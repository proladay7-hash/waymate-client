import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { API_BASE_URL } from '../config/api';

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'SOS' | 'CHAT_MESSAGE' | 'POST_LIKE' | 'POST_COMMENT' | 'POST_SHARE' | 'SYSTEM';
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  referenceId?: string;
  metadataJson?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Real-time notifications are retrieved from backend waymate-service
let localNotifications: NotificationDto[] = [];

// Configure Expo Notification Handler to display alert banners, sound, and badges on the phone
try {
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 2,
      }),
    });
  }
} catch (err) {
  console.log('[NotificationService] Notification handler init deferred:', err);
}

/**
 * Request notification permissions from user's phone operating system.
 * Configures Android channels for SOS emergencies, chat, and community social alerts.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const inExpoGo = typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false;

    // Expo Go on Android does not support custom notification channels (SDK 53+).
    // Custom channels are active in standalone builds and development clients (expo-dev-client).
    if (Platform.OS === 'android' && !inExpoGo && Notifications && typeof Notifications.setNotificationChannelAsync === 'function') {
      try {
        // Emergency SOS Channel - Highest priority, loud vibration & lights
        await Notifications.setNotificationChannelAsync('emergency-sos', {
          name: 'Emergency SOS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500, 250, 500],
          lightColor: '#EF4444',
          enableLights: true,
          enableVibrate: true,
        });

        // Social reactions (like, comment, share) Channel
        await Notifications.setNotificationChannelAsync('social-alerts', {
          name: 'Social & Post Reactions',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#0052FF',
          enableVibrate: true,
        });

        // Direct & Group Chat Channel
        await Notifications.setNotificationChannelAsync('chat-messages', {
          name: 'Rider Chat Messages',
          importance: Notifications.AndroidImportance.HIGH,
          lightColor: '#10B981',
          enableVibrate: true,
        });
      } catch (channelErr) {
        // Suppress channel setup exception in environments where channel manager is unavailable
        console.log('[NotificationService] Android custom channels deferred (unsupported in current runtime).');
      }
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.log('[NotificationService] Notification permission status:', err);
    return false;
  }
}

/**
 * Trigger an immediate notification on the user's phone.
 */
export async function triggerLocalPhoneNotification(
  title: string,
  body: string,
  data: Record<string, any> = {},
  channelId: 'emergency-sos' | 'social-alerts' | 'chat-messages' = 'social-alerts',
  avatarUrl?: string
) {
  try {
    const content: any = {
      title,
      body,
      data: {
        ...data,
        senderAvatar: avatarUrl || data.senderAvatar,
        senderName: data.senderName || title,
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: channelId === 'emergency-sos' ? '#EF4444' : channelId === 'chat-messages' ? '#10B981' : '#0052FF',
    };

    if (avatarUrl) {
      content.attachments = [{ url: avatarUrl }];
    }

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.log('[NotificationService] Local push notification triggered (simulator or device)', err);
  }
}

/**
 * Fetch all notifications for a user from waymate-service.
 */
export async function fetchNotificationsApi(userId: string): Promise<NotificationDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications?userId=${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((n: NotificationDto) => n.type !== 'CHAT_MESSAGE');
      }
    }
  } catch (e) {
    console.log('[NotificationService] Fallback to local notifications store');
  }

  return localNotifications.filter((n) => n.type !== 'CHAT_MESSAGE');
}

/**
 * Fetch unread notification count.
 */
export async function fetchUnreadCountApi(userId: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/unread-count?userId=${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.unreadCount === 'number') {
        return data.unreadCount;
      }
    }
  } catch (e) {
    // Ignored
  }

  return localNotifications.filter((n) => !n.isRead && n.type !== 'CHAT_MESSAGE').length;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadApi(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Ignored
  }

  const n = localNotifications.find((x) => x.id === id);
  if (n) n.isRead = true;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsReadApi(userId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/notifications/read-all?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Ignored
  }

  localNotifications.forEach((n) => {
    n.isRead = true;
  });
}
