import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserDto } from '../services/authApi';
import { ChatRoomDto, fetchUserRooms, getOrCreateDirectRoom, markLocalRoomRead } from '../services/chatApi';
import { searchRidersApi } from '../services/socialApi';
import { chatWs } from '../services/chatWs';
import CreateGroupModal from './CreateGroupModal';

interface ChatListScreenProps {
  currentUser: UserDto | null;
  onSelectRoom: (room: ChatRoomDto) => void;
  onUnreadCountSync?: (count: number) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function ChatListScreen({
  currentUser,
  onSelectRoom,
  onUnreadCountSync,
  showToast,
}: ChatListScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState<ChatRoomDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'DIRECT' | 'GROUP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupVisible, setIsCreateGroupVisible] = useState(false);

  // Rider search state
  const [searchedRiders, setSearchedRiders] = useState<UserDto[]>([]);
  const [isSearchingRiders, setIsSearchingRiders] = useState(false);
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);

  const loadRooms = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchUserRooms(currentUser.id);
      setRooms(data);
      if (onUnreadCountSync) {
        const total = data.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
        onUnreadCountSync(total);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const processedRoomMsgIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadRooms();
  }, [currentUser]);

  // Real-time WebSocket subscription for live incoming messages & status updates
  useEffect(() => {
    const removeMsgListener = chatWs.addMessageListener((incoming) => {
      if (!incoming || !incoming.id) return;
      const alreadyProcessed = processedRoomMsgIdsRef.current.has(incoming.id);
      if (!alreadyProcessed) {
        processedRoomMsgIdsRef.current.add(incoming.id);
        if (processedRoomMsgIdsRef.current.size > 300) {
          const first = processedRoomMsgIdsRef.current.values().next().value;
          if (first) processedRoomMsgIdsRef.current.delete(first);
        }
      }

      setRooms((prev) => {
        const senderIdStr = String(incoming.senderId || '').trim().toLowerCase();
        const currentUserIdStr = String(currentUser?.id || '').trim().toLowerCase();
        const isFromOthers = Boolean(senderIdStr && currentUserIdStr && senderIdStr !== currentUserIdStr);
        const incomingRoomId = String(incoming.roomId || '').trim().toLowerCase();
        const exists = prev.some((r) => String(r.id).trim().toLowerCase() === incomingRoomId);

        let snippet = incoming.content || 'Sent an attachment';
        if (incoming.type === 'IMAGE') snippet = '📷 Photo';
        else if (incoming.type === 'LOCATION') snippet = '📍 GPS Location';
        else if (incoming.type === 'TRIP') snippet = '🏍️ Trip Card';

        if (exists) {
          const updated = prev.map((r) => {
            if (String(r.id).trim().toLowerCase() === incomingRoomId) {
              const shouldIncrement = isFromOthers && !alreadyProcessed;
              return {
                ...r,
                lastMessageContent: snippet,
                lastMessageSender: incoming.senderName,
                lastMessageTime: incoming.createdAt || new Date().toISOString(),
                unreadCount: shouldIncrement ? (r.unreadCount || 0) + 1 : (r.unreadCount || 0),
              };
            }
            return r;
          });

          // Sort so the updated conversation jumps to the top
          updated.sort((a, b) => {
            if (String(a.id).trim().toLowerCase() === incomingRoomId) return -1;
            if (String(b.id).trim().toLowerCase() === incomingRoomId) return 1;
            return 0;
          });

          if (onUnreadCountSync) {
            const total = updated.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
            onUnreadCountSync(total);
          }

          return updated;
        } else {
          loadRooms();
          return prev;
        }
      });
    });

    const removeStatusListener = chatWs.addStatusListener((statusEvt) => {
      if (statusEvt.status === 'READ') {
        const evtRoomId = String(statusEvt.roomId || '').trim().toLowerCase();
        const evtUserId = String(statusEvt.userId || '').trim().toLowerCase();
        const currentUserId = String(currentUser?.id || '').trim().toLowerCase();

        setRooms((prev) => {
          const updated = prev.map((r) => {
            if (String(r.id).trim().toLowerCase() === evtRoomId && evtUserId === currentUserId) {
              return { ...r, unreadCount: 0 };
            }
            return r;
          });
          if (onUnreadCountSync) {
            const total = updated.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
            onUnreadCountSync(total);
          }
          return updated;
        });
      }
    });

    return () => {
      removeMsgListener();
      removeStatusListener();
    };
  }, [currentUser?.id]);

  // Debounced search for riders in database via waymate-service
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchedRiders([]);
      setIsSearchingRiders(false);
      return;
    }

    setIsSearchingRiders(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchRidersApi(q);
        // Exclude current user from search results
        const filtered = results.filter(
          (u) =>
            u.id !== currentUser?.id &&
            u.email?.toLowerCase() !== currentUser?.email?.toLowerCase()
        );
        setSearchedRiders(filtered);
      } catch (err) {
        console.log('[ChatListScreen] Search riders error:', err);
      } finally {
        setIsSearchingRiders(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?.id, currentUser?.email]);

  // Start 1-on-1 direct chat with a searched rider and persist to database
  const handleStartDirectChat = async (rider: UserDto) => {
    if (!currentUser) {
      if (showToast) showToast('Please sign in to start chatting', 'info');
      return;
    }
    try {
      setStartingChatUserId(rider.id);
      const directRoom = await getOrCreateDirectRoom(
        currentUser.id,
        rider.id,
        rider.name,
        rider.avatar
      );
      // Prepend to current rooms list if not already present
      setRooms((prev) => {
        if (prev.some((r) => r.id === directRoom.id)) return prev;
        return [directRoom, ...prev];
      });
      // Navigate to chat room immediately
      onSelectRoom(directRoom);
    } catch (err: any) {
      if (showToast) showToast('Failed to start chat with rider', 'info');
    } finally {
      setStartingChatUserId(null);
    }
  };

  const handleRoomPress = (room: ChatRoomDto) => {
    // Clear unread count locally so bold is immediately removed upon opening, like Messenger
    markLocalRoomRead(room.id);
    const updated = rooms.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r));
    setRooms(updated);
    if (onUnreadCountSync) {
      const total = updated.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
      onUnreadCountSync(total);
    }
    onSelectRoom({ ...room, unreadCount: 0 });
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterType === 'DIRECT' && r.type !== 'DIRECT') return false;
    if (filterType === 'GROUP' && r.type !== 'GROUP') return false;
    if (searchQuery.trim()) {
      const matchName = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMsg = r.lastMessageContent?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchName || matchMsg;
    }
    return true;
  });

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return `${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return '';
    }
  };

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search & Actions Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: isSearchActive ? colors.mBlue : colors.border },
          ]}
        >
          <AntDesign name="search" size={15} color={isSearchActive ? colors.mBlue : colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchChatsPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearchingRiders ? (
            <ActivityIndicator size="small" color={colors.mBlue} style={{ marginRight: 2 }} />
          ) : searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AntDesign name="close-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.createGroupBtn, { backgroundColor: colors.mBlue }]}
          onPress={() => setIsCreateGroupVisible(true)}
          activeOpacity={0.8}
        >
          <FontAwesome6 name="user-group" size={13} color="#FFFFFF" />
          <Text style={styles.createGroupBtnText}>{t('newGroup')}</Text>
        </TouchableOpacity>
      </View>

      {/* When SEARCH IS ACTIVE: Display dual results (Riders in DB + Conversations) */}
      {isSearchActive ? (
        <ScrollView
          style={styles.searchScrollView}
          contentContainerStyle={styles.searchScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Riders from Database */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <FontAwesome6 name="users" size={13} color={colors.mBlue} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ridersFound')}</Text>
            </View>
            <View style={[styles.sectionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionBadgeText, { color: colors.textMuted }]}>
                {searchedRiders.length}
              </Text>
            </View>
          </View>

          {isSearchingRiders && searchedRiders.length === 0 ? (
            <View style={styles.searchingCard}>
              <ActivityIndicator size="small" color={colors.mBlue} />
              <Text style={[styles.searchingText, { color: colors.textMuted }]}>
                {t('searchingRiders')}
              </Text>
            </View>
          ) : searchedRiders.length > 0 ? (
            <View style={[styles.resultsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {searchedRiders.map((rider) => {
                const isStarting = startingChatUserId === rider.id;
                return (
                  <TouchableOpacity
                    key={rider.id}
                    style={[styles.riderCard, { borderBottomColor: colors.border }]}
                    onPress={() => handleStartDirectChat(rider)}
                    activeOpacity={0.7}
                    disabled={isStarting}
                  >
                    <View style={styles.riderAvatarWrap}>
                      <Image
                        source={{
                          uri:
                            rider.avatar ||
                            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
                        }}
                        style={styles.riderAvatar}
                      />
                      <View
                        style={[
                          styles.riderOnlineDot,
                          {
                            backgroundColor: colors.success || '#10B981',
                            borderColor: colors.surface,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.riderInfo}>
                      <Text style={[styles.riderName, { color: colors.text }]} numberOfLines={1}>
                        {rider.name}
                      </Text>
                      {rider.email ? (
                        <Text style={[styles.riderEmail, { color: colors.textMuted }]} numberOfLines={1}>
                          {rider.email}
                        </Text>
                      ) : null}
                      {rider.bio ? (
                        <Text style={[styles.riderBio, { color: colors.textMuted }]} numberOfLines={1}>
                          🏍️ {rider.bio}
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={[styles.chatActionBtn, { backgroundColor: colors.mBlue }]}
                      onPress={() => handleStartDirectChat(rider)}
                      disabled={isStarting}
                      activeOpacity={0.8}
                    >
                      {isStarting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <AntDesign name="message" size={13} color="#FFFFFF" />
                          <Text style={styles.chatActionBtnText}>{t('startChatting')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.subtleEmpty}>
              <Text style={[styles.subtleEmptyText, { color: colors.textMuted }]}>
                {t('noRidersFound')}
              </Text>
            </View>
          )}

          {/* Section 2: Matched Conversations */}
          <View style={[styles.sectionHeader, { marginTop: 14 }]}>
            <View style={styles.sectionTitleWrap}>
              <FontAwesome6 name="comments" size={13} color={colors.mBlue} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('chatsFound')}</Text>
            </View>
            <View style={[styles.sectionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionBadgeText, { color: colors.textMuted }]}>
                {filteredRooms.length}
              </Text>
            </View>
          </View>

          {filteredRooms.length > 0 ? (
            <View style={[styles.resultsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {filteredRooms.map((room) => {
                const isGroup = room.type === 'GROUP';
                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[styles.roomItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleRoomPress(room)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarWrapper}>
                      <Image
                        source={{
                          uri:
                            room.avatar ||
                            (isGroup
                              ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80'
                              : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'),
                        }}
                        style={styles.roomAvatar}
                      />
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: isGroup ? colors.mRed : colors.mBlue,
                            borderColor: colors.surface,
                          },
                        ]}
                      >
                        <FontAwesome6
                          name={isGroup ? 'users' : 'motorcycle'}
                          size={7}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>

                    <View style={styles.roomInfo}>
                      <View style={styles.roomTitleRow}>
                        <Text
                          style={[
                            styles.roomName,
                            { color: colors.text },
                            room.unreadCount ? styles.roomNameUnread : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {room.name}
                        </Text>
                        <Text
                          style={[
                            styles.roomTime,
                            { color: room.unreadCount ? colors.mBlue : colors.textMuted },
                            room.unreadCount ? styles.roomTimeUnread : undefined,
                          ]}
                        >
                          {formatTimestamp(room.lastMessageTime)}
                        </Text>
                      </View>

                      <View style={styles.roomSnippetRow}>
                        <Text
                          style={[
                            styles.roomSnippet,
                            { color: room.unreadCount ? colors.text : colors.textMuted },
                            room.unreadCount ? styles.roomSnippetUnread : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {room.lastMessageSender ? `${room.lastMessageSender}: ` : ''}
                          {room.lastMessageContent || 'No messages yet'}
                        </Text>

                        {room.unreadCount ? (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.mBlue }]}>
                            <Text style={styles.unreadBadgeText}>{room.unreadCount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.subtleEmpty}>
              <Text style={[styles.subtleEmptyText, { color: colors.textMuted }]}>
                No existing conversations matching "{searchQuery}"
              </Text>
            </View>
          )}

          {/* If completely empty */}
          {!isSearchingRiders && searchedRiders.length === 0 && filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="magnifying-glass" size={38} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No riders or conversations found for "{searchQuery}". You can check the name or email spelling.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        /* When SEARCH IS NOT ACTIVE: Display Tabs & Full Conversation List */
        <>
          {/* Filter Tabs */}
          <View
            style={[
              styles.tabsRow,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabBtn,
                filterType === 'ALL' && [styles.tabBtnActive, { borderBottomColor: colors.mBlue }],
              ]}
              onPress={() => setFilterType('ALL')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: filterType === 'ALL' ? colors.mBlue : colors.textMuted },
                  filterType === 'ALL' && styles.tabTextActive,
                ]}
              >
                {t('allChats')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                filterType === 'DIRECT' && [styles.tabBtnActive, { borderBottomColor: colors.mBlue }],
              ]}
              onPress={() => setFilterType('DIRECT')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: filterType === 'DIRECT' ? colors.mBlue : colors.textMuted },
                  filterType === 'DIRECT' && styles.tabTextActive,
                ]}
              >
                {t('directChats')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                filterType === 'GROUP' && [styles.tabBtnActive, { borderBottomColor: colors.mBlue }],
              ]}
              onPress={() => setFilterType('GROUP')}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: filterType === 'GROUP' ? colors.mBlue : colors.textMuted },
                  filterType === 'GROUP' && styles.tabTextActive,
                ]}
              >
                {t('groupChats')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conversations List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.mBlue} />
            </View>
          ) : filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="comments" size={42} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('chatRoomsTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                No active conversations yet. Search riders by name above or create a group to start chatting!
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.mBlue }]}
                onPress={() => setIsCreateGroupVisible(true)}
                activeOpacity={0.8}
              >
                <AntDesign name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>{t('createGroupTitle')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredRooms}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isGroup = item.type === 'GROUP';
                return (
                  <TouchableOpacity
                    style={[
                      styles.roomItem,
                      { backgroundColor: colors.surface, borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleRoomPress(item)}
                    activeOpacity={0.7}
                  >
                    {/* Avatar with type badge */}
                    <View style={styles.avatarWrapper}>
                      <Image
                        source={{
                          uri:
                            item.avatar ||
                            (isGroup
                              ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80'
                              : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'),
                        }}
                        style={styles.roomAvatar}
                      />
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: isGroup ? colors.mRed : colors.mBlue,
                            borderColor: colors.surface,
                          },
                        ]}
                      >
                        <FontAwesome6
                          name={isGroup ? 'users' : 'motorcycle'}
                          size={7}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>

                    {/* Room Info */}
                    <View style={styles.roomInfo}>
                      <View style={styles.roomTitleRow}>
                        <Text
                          style={[
                            styles.roomName,
                            { color: colors.text },
                            item.unreadCount ? styles.roomNameUnread : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.roomTime,
                            { color: item.unreadCount ? colors.mBlue : colors.textMuted },
                            item.unreadCount ? styles.roomTimeUnread : undefined,
                          ]}
                        >
                          {formatTimestamp(item.lastMessageTime)}
                        </Text>
                      </View>

                      <View style={styles.roomSnippetRow}>
                        <Text
                          style={[
                            styles.roomSnippet,
                            { color: item.unreadCount ? colors.text : colors.textMuted },
                            item.unreadCount ? styles.roomSnippetUnread : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {item.lastMessageSender ? `${item.lastMessageSender}: ` : ''}
                          {item.lastMessageContent || 'No messages yet'}
                        </Text>

                        {item.unreadCount ? (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.mBlue }]}>
                            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={isCreateGroupVisible}
        onClose={() => setIsCreateGroupVisible(false)}
        currentUser={currentUser}
        onGroupCreated={(newRoom) => {
          setRooms([newRoom, ...rooms]);
          onSelectRoom(newRoom);
        }}
        showToast={showToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  createGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createGroupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 20,
  },
  searchScrollView: {
    flex: 1,
  },
  searchScrollContent: {
    paddingBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultsGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  searchingText: {
    fontSize: 13,
  },
  subtleEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subtleEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  riderAvatarWrap: {
    position: 'relative',
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  riderOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  riderInfo: {
    flex: 1,
    gap: 2,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '700',
  },
  riderEmail: {
    fontSize: 12,
  },
  riderBio: {
    fontSize: 11,
    marginTop: 2,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chatActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  roomAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
    gap: 4,
  },
  roomTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  roomNameUnread: {
    fontWeight: '900',
  },
  roomTime: {
    fontSize: 11,
    fontWeight: '400',
  },
  roomTimeUnread: {
    fontWeight: '800',
  },
  roomSnippetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomSnippet: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  roomSnippetUnread: {
    fontWeight: '800',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
