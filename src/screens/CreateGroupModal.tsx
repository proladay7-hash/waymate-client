import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserDto } from '../services/authApi';
import { ChatRoomDto, createGroupRoomApi } from '../services/chatApi';
import { fetchFriendsApi, searchRidersApi } from '../services/socialApi';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserDto | null;
  onGroupCreated: (newRoom: ChatRoomDto) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

const GROUP_AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80',
];

export default function CreateGroupModal({
  visible,
  onClose,
  currentUser,
  onGroupCreated,
  showToast,
}: CreateGroupModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [groupName, setGroupName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GROUP_AVATAR_PRESETS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableRiders, setAvailableRiders] = useState<UserDto[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && currentUser) {
      fetchFriendsApi(currentUser.id).then((riders) => {
        setAvailableRiders(riders);
      });
      setSelectedMemberIds([]);
      setGroupName('');
    }
  }, [visible, currentUser]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      if (currentUser) fetchFriendsApi(currentUser.id).then(setAvailableRiders);
      return;
    }
    searchRidersApi(q).then((results) => {
      setAvailableRiders(results.filter((u) => u.id !== currentUser?.id));
    });
  };

  const toggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((mid) => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newRoom = await createGroupRoomApi(
        currentUser.id,
        groupName.trim(),
        selectedAvatar,
        selectedMemberIds
      );
      if (showToast) {
        showToast(`Group "${newRoom.name}" created! 🎉`, 'success');
      }
      onClose();
      onGroupCreated(newRoom);
    } catch {
      // Ignored
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('createGroupTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <AntDesign name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Group Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Group Name</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                placeholder={t('groupNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            {/* Choose Avatar Preset */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Group Icon</Text>
              <View style={styles.avatarRow}>
                {GROUP_AVATAR_PRESETS.map((uri, idx) => {
                  const isSelected = selectedAvatar === uri;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedAvatar(uri)}
                      activeOpacity={0.8}
                      style={[
                        styles.avatarOption,
                        isSelected && { borderColor: colors.mBlue, borderWidth: 3 },
                      ]}
                    >
                      <Image source={{ uri }} style={styles.avatarImg} />
                      {isSelected && (
                        <View style={[styles.avatarCheckBadge, { backgroundColor: colors.mBlue }]}>
                          <AntDesign name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Add Members Section */}
            <View style={styles.inputGroup}>
              <View style={styles.memberHeaderRow}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Add Members ({selectedMemberIds.length} selected)
                </Text>
              </View>

              {/* Search riders */}
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <AntDesign name="search" size={15} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={t('searchChatsPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                />
              </View>

              {/* Rider List */}
              <View style={styles.riderList}>
                {availableRiders.map((rider) => {
                  const isChecked = selectedMemberIds.includes(rider.id);
                  return (
                    <TouchableOpacity
                      key={rider.id}
                      style={[
                        styles.riderItem,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isChecked && { borderColor: colors.mBlue },
                      ]}
                      onPress={() => toggleSelectMember(rider.id)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri:
                            rider.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
                        }}
                        style={styles.riderAvatar}
                      />
                      <View style={styles.riderDetails}>
                        <Text style={[styles.riderName, { color: colors.text }]} numberOfLines={1}>
                          {rider.name}
                        </Text>
                        <Text style={[styles.riderRole, { color: colors.textMuted }]} numberOfLines={1}>
                          {rider.bio || rider.role || 'Rider'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: isChecked ? colors.mBlue : colors.border },
                          isChecked && { backgroundColor: colors.mBlue },
                        ]}
                      >
                        {isChecked && <AntDesign name="check" size={12} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: groupName.trim() ? colors.mBlue : colors.border },
            ]}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <FontAwesome6 name="users" size={15} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>{t('createGroupTitle')}</Text>
              </>
            )}
          </TouchableOpacity>
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
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarOption: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  avatarCheckBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  riderList: {
    gap: 8,
    marginTop: 4,
  },
  riderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '700',
  },
  riderRole: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
