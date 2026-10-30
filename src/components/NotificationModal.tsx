import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserDto } from '../services/authApi';
import {
  NotificationDto,
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../services/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserDto | null;
  onSelectNotification?: (notif: NotificationDto) => void;
}

export default function NotificationModal({
  visible,
  onClose,
  currentUser,
  onSelectNotification,
}: NotificationModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await fetchNotificationsApi(currentUser.id);
      const currentUid = String(currentUser.id || '').trim().toLowerCase();
      setNotifications(
        data.filter(
          (n) =>
            n.type !== 'CHAT_MESSAGE' &&
            (!n.senderId || String(n.senderId).trim().toLowerCase() !== currentUid)
        )
      );
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && currentUser) {
      loadNotifications();
    }
  }, [visible, currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await markAllNotificationsReadApi(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemPress = async (item: NotificationDto) => {
    if (!item.isRead) {
      markNotificationReadApi(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    if (onSelectNotification) {
      onSelectNotification(item);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SOS':
        return { name: 'triangle-exclamation', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'CHAT_MESSAGE':
        return { name: 'comment-dots', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'POST_LIKE':
        return { name: 'heart', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
      case 'POST_COMMENT':
        return { name: 'message', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'POST_SHARE':
        return { name: 'share-nodes', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      default:
        return { name: 'bell', color: colors.mBlue, bg: 'rgba(0, 82, 255, 0.15)' };
    }
  };

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleWrap}>
              <FontAwesome6 name="bell" size={17} color={colors.mBlue} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
              {notifications.some((n) => !n.isRead) ? (
                <View style={[styles.unreadDot, { backgroundColor: colors.mRed }]} />
              ) : null}
            </View>

            <View style={styles.headerRight}>
              {notifications.some((n) => !n.isRead) ? (
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
                  <Text style={[styles.markAllText, { color: colors.mBlue }]}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Body List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.mBlue} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="bell-slash" size={38} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                You will receive alerts here when riders like, comment, or share your posts, send messages, or broadcast an emergency SOS.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const iconInfo = getNotificationIcon(item.type);
                return (
                  <TouchableOpacity
                    style={[
                      styles.notifItem,
                      {
                        backgroundColor: item.isRead ? 'transparent' : isDark ? 'rgba(0, 82, 255, 0.08)' : '#F0F7FF',
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.leftCol}>
                      {item.senderAvatar ? (
                        <View style={styles.avatarWrap}>
                          <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
                          <View style={[styles.typeBadge, { backgroundColor: iconInfo.color }]}>
                            <FontAwesome6 name={iconInfo.name} size={8} color="#FFFFFF" />
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.iconCircle, { backgroundColor: iconInfo.bg }]}>
                          <FontAwesome6 name={iconInfo.name} size={15} color={iconInfo.color} />
                        </View>
                      )}
                    </View>

                    <View style={styles.textCol}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: colors.text },
                            !item.isRead && { fontWeight: '800' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                          {formatRelativeTime(item.createdAt)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.notifContent,
                          { color: item.isRead ? colors.textMuted : colors.text },
                        ]}
                        numberOfLines={2}
                      >
                        {item.content}
                      </Text>
                    </View>

                    {!item.isRead ? (
                      <View style={[styles.unreadCircle, { backgroundColor: colors.mBlue }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  leftCol: {
    position: 'relative',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 11,
  },
  notifContent: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  unreadCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
});
