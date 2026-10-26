import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserDto } from '../services/authApi';
import {
  checkFriendshipStatusApi,
  sendFriendRequestApi,
} from '../services/socialApi';

interface RiderProfileModalProps {
  visible: boolean;
  onClose: () => void;
  targetUser: UserDto | null;
  currentUserId?: string;
  onOpenDirectChat?: (otherUserId: string, otherUserName: string, otherAvatar?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function RiderProfileModal({
  visible,
  onClose,
  targetUser,
  currentUserId,
  onOpenDirectChat,
  showToast,
}: RiderProfileModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [friendStatus, setFriendStatus] = useState<string>('NONE');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (visible && targetUser && currentUserId) {
      checkFriendshipStatusApi(currentUserId, targetUser.id).then((status) => {
        setFriendStatus(status);
      });
    }
  }, [visible, targetUser, currentUserId]);

  if (!targetUser) return null;

  const handleSendFriendRequest = async () => {
    if (!currentUserId || loadingAction) return;
    setLoadingAction(true);
    try {
      await sendFriendRequestApi(currentUserId, targetUser.id);
      setFriendStatus('PENDING_OUTGOING');
      if (showToast) {
        showToast(t('friendRequestSentAction'), 'success');
      }
    } catch {
      // Ignored
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartChat = () => {
    onClose();
    if (onOpenDirectChat) {
      onOpenDirectChat(targetUser.id, targetUser.name, targetUser.avatar);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('riderProfileTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <AntDesign name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Banner & Avatar */}
            <View style={styles.bannerContainer}>
              <LinearGradient
                colors={colors.mGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerGradient}
              >
                <View style={styles.verifiedBadge}>
                  <FontAwesome6 name="motorcycle" size={10} color="#FFFFFF" />
                  <Text style={styles.verifiedBadgeText}>VERIFIED RIDER</Text>
                </View>
              </LinearGradient>

              <View style={styles.avatarWrapper}>
                <Image
                  source={{
                    uri:
                      targetUser.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
                  }}
                  style={[styles.avatarImage, { borderColor: colors.surface }]}
                />
                <View style={[styles.avatarBolt, { backgroundColor: colors.mRed, borderColor: colors.surface }]}>
                  <FontAwesome6 name="bolt" size={8} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.infoSection}>
              <Text style={[styles.userName, { color: colors.text }]}>{targetUser.name}</Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{targetUser.email}</Text>

              {targetUser.bio && (
                <Text style={[styles.userBio, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}>
                  {`"${targetUser.bio}"`}
                </Text>
              )}

              {/* Stats Row */}
              <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.mBlue }]}>
                    {targetUser.point != null ? targetUser.point.toLocaleString() : '1,250'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rider XP</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.mRed }]}>
                    {targetUser.role || 'PRO RIDER'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rank</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.text }]}>Active</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Status</Text>
                </View>
              </View>

              {/* Action Buttons: Add Friend & Message */}
              <View style={styles.actionRow}>
                {friendStatus === 'FRIENDS' ? (
                  <View style={[styles.actionBtn, styles.friendsBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.mBlue }]}>
                    <AntDesign name="check" size={14} color={colors.mBlue} />
                    <Text style={[styles.actionBtnText, { color: colors.mBlue }]}>{t('alreadyFriendsAction')}</Text>
                  </View>
                ) : friendStatus === 'PENDING_OUTGOING' ? (
                  <View style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <AntDesign name="clock-circle" size={14} color={colors.textMuted} />
                    <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>{t('friendRequestSentAction')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.mBlue }]}
                    onPress={handleSendFriendRequest}
                    disabled={loadingAction}
                    activeOpacity={0.8}
                  >
                    {loadingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <FontAwesome6 name="user-plus" size={13} color="#FFFFFF" />
                        <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>{t('addFriendAction')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.messageBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleStartChat}
                  activeOpacity={0.8}
                >
                  <AntDesign name="message" size={15} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('directMessageAction')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  bannerContainer: {
    position: 'relative',
    marginBottom: 44,
  },
  bannerGradient: {
    height: 90,
    borderRadius: 14,
    padding: 8,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarWrapper: {
    position: 'absolute',
    bottom: -36,
    left: 16,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
  },
  avatarBolt: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 4,
    gap: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 13,
    marginTop: -8,
  },
  userBio: {
    fontSize: 13,
    fontStyle: 'italic',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  messageBtn: {
    borderWidth: 1,
  },
  friendsBadge: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
