import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ScrollViewInstance,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { UserDto } from '../services/authApi';
import WayMateAgentIcon from '../components/WayMateAgentIcon';
import {
  ChatRoomDto,
  MessageDto,
  MessageType,
  fetchRoomMessages,
  sendMessageApi,
  addMembersToGroupApi,
  updateMessageStatusApi,
} from '../services/chatApi';
import { chatWs } from '../services/chatWs';
import { TripData } from '../data/mockTrips';
import { fetchTripsApi } from '../services/tripApi';
import { openGoogleMapsLinkOrCoords, openGoogleMapsLocation } from '../utils/mapUtils';
import RiderProfileModal from './RiderProfileModal';

interface ChatRoomScreenProps {
  room: ChatRoomDto;
  currentUser: UserDto | null;
  onBack: () => void;
  onNavigateToTrip?: (tripId: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function ChatRoomScreen({
  room,
  currentUser,
  onBack,
  onNavigateToTrip,
  showToast,
}: ChatRoomScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userLocation } = useUserLocation();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState('');

  // Typing states
  const [userTypingText, setUserTypingText] = useState<string | null>(null);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Rider Profile Modal for inspection
  const [selectedRider, setSelectedRider] = useState<UserDto | null>(null);

  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGroup = room.type === 'GROUP';
  const myId = currentUser?.id || 'demo-user-1';
  const myName = currentUser?.name || 'Me';
  const myAvatar = currentUser?.avatar;

  const [availableTrips, setAvailableTrips] = useState<TripData[]>([]);
  useEffect(() => {
    fetchTripsApi().then(setAvailableTrips);
  }, []);

  // Auto-scroll messages to bottom when soft keyboard appears & track open state
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Initial load & WebSocket subscription
  useEffect(() => {
    let isMounted = true;

    // Load initial room messages
    fetchRoomMessages(room.id).then((history) => {
      if (isMounted) {
        setMessages(history);
        setLoading(false);
        // Mark unread messages as read (brief delay lets user notice unread bold state, then removes bold like Messenger)
        const hasUnread = history.some((m) => m.senderId !== myId && m.status !== 'READ');
        if (hasUnread) {
          setTimeout(() => {
            if (!isMounted) return;
            setMessages((prev) =>
              prev.map((m) => (m.senderId !== myId && m.status !== 'READ' ? { ...m, status: 'READ' } : m))
            );
          }, 1200);

          history.forEach((m) => {
            if (m.senderId !== myId && m.status !== 'READ') {
              updateMessageStatusApi(m.id, 'READ', myId);
              chatWs.sendStatusUpdate(m.id, room.id, 'READ', myId);
            }
          });
        }
      }
    });

    // Join room over WebSocket
    chatWs.joinRoom(room.id, myId, myName);

    // Listen to incoming messages
    const removeMsgListener = chatWs.addMessageListener((incoming) => {
      if (incoming.roomId === room.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });

        // Mark incoming message as read if from others (no phone push notification inside active chat room)
        if (incoming.senderId !== myId) {
          chatWs.sendStatusUpdate(incoming.id, room.id, 'READ', myId);
        }
      }
    });

    // Listen to status updates
    const removeStatusListener = chatWs.addStatusListener((statusEvt) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === statusEvt.messageId ? { ...m, status: statusEvt.status } : m))
      );
    });

    // Listen to user typing
    const removeTypingListener = chatWs.addTypingListener((evt) => {
      if (evt.roomId === room.id && evt.userId !== myId) {
        if (evt.isTyping) {
          setUserTypingText(`${evt.userName} is typing...`);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setUserTypingText(null), 3000);
        } else {
          setUserTypingText(null);
        }
      }
    });

    // Listen to AI typing
    const removeAiTypingListener = chatWs.addAiTypingListener((evt) => {
      if (evt.roomId === room.id) {
        setIsAiTyping(evt.isTyping);
      }
    });

    return () => {
      isMounted = false;
      chatWs.leaveRoom(room.id);
      removeMsgListener();
      removeStatusListener();
      removeTypingListener();
      removeAiTypingListener();
    };
  }, [room.id, myId]);

  useEffect(() => {
    // Scroll to bottom on new message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, [messages, isAiTyping]);

  // Dispatch outgoing message
  const handleSendMessage = (
    content: string,
    type: MessageType = 'TEXT',
    mediaUrl?: string,
    metadataJson?: string
  ) => {
    if (!content.trim() && !mediaUrl && !metadataJson) return;

    if (chatWs.isConnected()) {
      chatWs.sendMessage({
        roomId: room.id,
        senderId: myId,
        senderName: myName,
        senderAvatar: myAvatar,
        content,
        msgType: type,
        mediaUrl,
        metadataJson,
      });
    } else {
      // Fallback through REST service when WebSocket is disconnected/reconnecting
      sendMessageApi({
        roomId: room.id,
        senderId: myId,
        senderName: myName,
        senderAvatar: myAvatar,
        content,
        type,
        mediaUrl,
        metadataJson,
      }).then((saved) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
      });
    }

    setInputText('');
    setShowAttachmentMenu(false);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    chatWs.sendTyping(room.id, myId, myName, text.length > 0);
  };

  const insertAiTag = () => {
    if (!inputText.includes('@WayMate')) {
      setInputText((prev) => (prev ? `${prev} @WayMate ` : '@WayMate '));
    }
  };

  // Attachment: Share GPS Location
  const handleShareLocation = () => {
    const lat = userLocation?.latitude || 11.9404;
    const lng = userLocation?.longitude || 108.4583;
    const locMeta = {
      lat,
      lng,
      address: userLocation ? 'Current GPS Location' : 'Đà Lạt City, Lâm Đồng',
      name: 'Rider Shared Location',
    };

    handleSendMessage(
      '📍 Here is my current GPS location on the route:',
      'LOCATION',
      undefined,
      JSON.stringify(locMeta)
    );
    if (showToast) showToast(t('locationSentToast'), 'success');
  };

  // Attachment: Share Trip
  const handleSelectTripToShare = (trip: TripData) => {
    const tripMeta = {
      tripId: trip.id,
      title: trip.title,
      distanceKm: trip.distanceKm,
      duration: trip.duration,
      coverImage: trip.coverImage,
    };

    handleSendMessage(
      `🏍️ Check out this ride trip: ${trip.title}`,
      'TRIP',
      trip.coverImage,
      JSON.stringify(tripMeta)
    );
    setShowTripPicker(false);
    if (showToast) showToast(t('tripSharedToast'), 'success');
  };

  // Attachment: Share Photo
  const handleSharePhoto = (url: string) => {
    if (!url.trim()) return;
    handleSendMessage('📷 Shared ride photo:', 'IMAGE', url.trim());
    setShowPhotoPrompt(false);
    setPhotoInputUrl('');
    if (showToast) showToast(t('photoSharedToast'), 'success');
  };

  // Render Status Icon for outgoing messages
  const renderStatusTicks = (status: string) => {
    if (status === 'READ') {
      return (
        <View style={styles.ticksRow}>
          <AntDesign name="check" size={10} color="#38BDF8" />
          <AntDesign name="check" size={10} color="#38BDF8" style={styles.overlapTick} />
        </View>
      );
    }
    if (status === 'DELIVERED') {
      return (
        <View style={styles.ticksRow}>
          <AntDesign name="check" size={10} color="rgba(255, 255, 255, 0.6)" />
          <AntDesign name="check" size={10} color="rgba(255, 255, 255, 0.6)" style={styles.overlapTick} />
        </View>
      );
    }
    // SENT
    return <AntDesign name="check" size={10} color="rgba(255, 255, 255, 0.6)" />;
  };

  const formatMsgTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const statusBarHeight = StatusBar.currentHeight || 0;
  const keyboardVerticalOffset =
    Platform.OS === 'ios'
      ? insets.top
      : (statusBarHeight > 0 ? statusBarHeight : (insets.top || 0));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <AntDesign name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleContainer}
          activeOpacity={0.7}
          onPress={() => {
            if (!isGroup) {
              setSelectedRider({
                id: room.memberIds.find((id) => id !== myId) || 'rider-alex',
                name: room.name,
                email: 'rider@waymate.com',
                avatar: room.avatar,
                bio: 'Passionate Adventure Rider | WayMate Community',
                point: 1450,
                role: 'PRO_RIDER',
              });
            }
          }}
        >
          <Image
            source={{
              uri:
                room.avatar ||
                'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80',
            }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.statusIndicatorRow}>
              <View style={[styles.onlineDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {isGroup ? `${room.memberIds.length} ${t('membersCountLabel')}` : 'Online'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={insertAiTag}
            activeOpacity={0.7}
          >
            <WayMateAgentIcon size={18} showAccents={false} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages ScrollView */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.mBlue} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyNotice}>
              <FontAwesome6 name="comments" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyNoticeText, { color: colors.textMuted }]}>
                {t('noMessagesInRoom')}
              </Text>
            </View>
          ) : (
            messages.map((item, index) => {
              const isMine = item.senderId === myId;
              const isAi = item.type === 'AI_RESPONSE' || item.senderId.includes('00000000');

              return (
                <View
                  key={item.id || index}
                  style={[
                    styles.messageRow,
                    isMine ? styles.messageRowMine : styles.messageRowOthers,
                  ]}
                >
                  {/* Sender Avatar for others/AI */}
                  {!isMine && (
                    <TouchableOpacity
                      onPress={() => {
                        if (!isAi) {
                          setSelectedRider({
                            id: item.senderId,
                            name: item.senderName,
                            email: `${item.senderName.toLowerCase().replace(/\s+/g, '')}@waymate.com`,
                            avatar: item.senderAvatar,
                            bio: 'Adventure Motorcyclist | WayMate Rider',
                            point: 1200,
                            role: 'RIDER',
                          });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {isAi ? (
                        <View style={[styles.bubbleAvatar, styles.aiAvatarWrapper, { borderColor: colors.mBlue, backgroundColor: colors.card, borderWidth: 1.5 }]}>
                          <WayMateAgentIcon size={20} showAccents={false} />
                        </View>
                      ) : (
                        <Image
                          source={{
                            uri:
                              item.senderAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
                          }}
                          style={styles.bubbleAvatar}
                        />
                      )}
                    </TouchableOpacity>
                  )}

                  <View
                    style={[
                      styles.bubbleWrapper,
                      isMine ? styles.bubbleWrapperMine : styles.bubbleWrapperOthers,
                    ]}
                  >
                    {/* Sender name for group messages from others */}
                    {!isMine && (
                      <View style={styles.senderHeader}>
                        <Text style={[styles.senderNameText, { color: isAi ? colors.mBlue : colors.textMuted }]}>
                          {item.senderName}
                        </Text>
                        {isAi && (
                          <View style={[styles.aiVerifiedPill, { backgroundColor: colors.mBlue }]}>
                            <Text style={styles.aiVerifiedText}>BOT</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Bubble Content Body */}
                    <View
                      style={[
                        styles.bubbleBody,
                        isMine
                          ? [styles.bubbleBodyMine, { backgroundColor: colors.mBlue }]
                          : [styles.bubbleBodyOthers, { backgroundColor: colors.card, borderColor: colors.border }],
                        isAi && [styles.bubbleBodyAi, { borderColor: colors.mBlue }],
                      ]}
                    >
                      {/* Rich: Image */}
                      {item.type === 'IMAGE' && item.mediaUrl && (
                        <Image source={{ uri: item.mediaUrl }} style={styles.attachedImage} />
                      )}

                      {/* Rich: Location Card */}
                      {item.type === 'LOCATION' && (
                        <View style={[styles.locationCard, { backgroundColor: isMine ? 'rgba(0,0,0,0.18)' : colors.surface }]}>
                          <View style={styles.locationHeader}>
                            <FontAwesome6 name="location-dot" size={14} color="#EF4444" />
                            <Text style={[styles.locationTitle, { color: isMine ? '#FFFFFF' : colors.text }]}>
                              GPS Route Location
                            </Text>
                          </View>
                          {(() => {
                            let locMeta: any = {};
                            try {
                              locMeta = JSON.parse(item.metadataJson || '{}');
                            } catch {}
                            const lat = Number(locMeta.lat) || 11.9404;
                            const lng = Number(locMeta.lng) || 108.4583;
                            const address = locMeta.address || locMeta.name || 'Current GPS Location';
                            return (
                              <>
                                <Text style={[styles.locationAddress, { color: isMine ? 'rgba(255,255,255,0.85)' : colors.textMuted }]}>
                                  {address}
                                </Text>
                                <TouchableOpacity
                                  style={[styles.mapsBtn, { backgroundColor: isMine ? '#FFFFFF' : colors.mBlue }]}
                                  onPress={() =>
                                    openGoogleMapsLocation(lat, lng, address)
                                  }
                                  activeOpacity={0.8}
                                >
                                  <FontAwesome6
                                    name="diamond-turn-right"
                                    size={11}
                                    color={isMine ? colors.mBlue : '#FFFFFF'}
                                  />
                                  <Text
                                    style={[
                                      styles.mapsBtnText,
                                      { color: isMine ? colors.mBlue : '#FFFFFF' },
                                    ]}
                                  >
                                    {t('openInGoogleMaps')}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            );
                          })()}
                        </View>
                      )}

                      {/* Rich: Trip Card */}
                      {item.type === 'TRIP' && (
                        <View style={[styles.tripCard, { backgroundColor: isMine ? 'rgba(0,0,0,0.18)' : colors.surface }]}>
                          {item.mediaUrl && (
                            <Image source={{ uri: item.mediaUrl }} style={styles.tripCover} />
                          )}
                          {(() => {
                            let tripMeta: any = {};
                            try {
                              tripMeta = JSON.parse(item.metadataJson || '{}');
                            } catch {}
                            return (
                              <View style={styles.tripContent}>
                                <Text style={[styles.tripTitle, { color: isMine ? '#FFFFFF' : colors.text }]}>
                                  {tripMeta.title || 'WayMate Adventure Trip'}
                                </Text>
                                <View style={styles.tripBadgeRow}>
                                  {tripMeta.distanceKm && (
                                    <View style={[styles.tripStatPill, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                                      <Text style={styles.tripStatText}>{tripMeta.distanceKm} km</Text>
                                    </View>
                                  )}
                                  {tripMeta.duration && (
                                    <View style={[styles.tripStatPill, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                                      <Text style={styles.tripStatText}>{tripMeta.duration}</Text>
                                    </View>
                                  )}
                                </View>
                                <TouchableOpacity
                                  style={[styles.mapsBtn, { backgroundColor: isMine ? '#FFFFFF' : colors.mBlue, marginTop: 6 }]}
                                  onPress={() => onNavigateToTrip && onNavigateToTrip(tripMeta.tripId || 'trip-1')}
                                  activeOpacity={0.8}
                                >
                                  <FontAwesome6 name="route" size={11} color={isMine ? colors.mBlue : '#FFFFFF'} />
                                  <Text style={[styles.mapsBtnText, { color: isMine ? colors.mBlue : '#FFFFFF' }]}>
                                    {t('viewTripAction')}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })()}
                        </View>
                      )}

                      {/* Text content with highlighted @WayMate mention */}
                      {item.content && (
                        <Text
                          style={[
                            styles.messageText,
                            { color: isMine ? '#FFFFFF' : colors.text },
                            !isMine && item.status !== 'READ' && styles.messageTextUnread,
                          ]}
                        >
                          {item.content}
                        </Text>
                      )}

                      {/* Timestamp & Status ticks */}
                      <View style={styles.metaRow}>
                        <Text
                          style={[
                            styles.msgTimeText,
                            { color: isMine ? 'rgba(255, 255, 255, 0.7)' : colors.textMuted },
                          ]}
                        >
                          {formatMsgTime(item.createdAt)}
                        </Text>
                        {isMine && renderStatusTicks(item.status)}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Typing indicators */}
          {userTypingText && (
            <View style={styles.typingRow}>
              <View style={[styles.typingDot, { backgroundColor: colors.mBlue }]} />
              <Text style={[styles.typingText, { color: colors.textMuted }]}>{userTypingText}</Text>
            </View>
          )}

          {/* AI Thinking Indicator */}
          {isAiTyping && (
            <View style={[styles.aiThinkingBox, { backgroundColor: colors.card, borderColor: colors.mBlue }]}>
              <ActivityIndicator size="small" color={colors.mBlue} />
              <Text style={[styles.aiThinkingText, { color: colors.mBlue }]}>
                {t('aiThinkingStatus')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Attachment Drawer Modal */}
      {showAttachmentMenu && (
        <View style={[styles.attachmentDrawer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.attachOption} onPress={handleShareLocation} activeOpacity={0.7}>
            <View style={[styles.attachCircle, { backgroundColor: '#EF4444' }]}>
              <FontAwesome6 name="location-dot" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.attachText, { color: colors.text }]}>{t('shareLocationAction')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => setShowTripPicker(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.attachCircle, { backgroundColor: colors.mBlue }]}>
              <FontAwesome6 name="route" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.attachText, { color: colors.text }]}>{t('shareTripAction')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachOption}
            onPress={() => setShowPhotoPrompt(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.attachCircle, { backgroundColor: '#10B981' }]}>
              <FontAwesome6 name="image" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.attachText, { color: colors.text }]}>{t('sharePhotoAction')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: isKeyboardOpen ? 8 : Math.max(insets.bottom, 8),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.attachToggleBtn,
            showAttachmentMenu && { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
          ]}
          onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}
          activeOpacity={0.7}
        >
          <AntDesign name={showAttachmentMenu ? 'close' : 'plus'} size={18} color={colors.mBlue} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.aiTagBtn} onPress={insertAiTag} activeOpacity={0.7}>
          <WayMateAgentIcon size={14} showAccents={false} />
          <Text style={[styles.aiTagBtnText, { color: colors.mBlue }]}>@WayMate</Text>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.chatInput,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          placeholder={t('typeMessagePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={handleInputChange}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? colors.mBlue : colors.border },
          ]}
          onPress={() => handleSendMessage(inputText)}
          disabled={!inputText.trim()}
          activeOpacity={0.8}
        >
          <FontAwesome6 name="arrow-up" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Select Trip Modal */}
      <Modal visible={showTripPicker} animationType="slide" transparent onRequestClose={() => setShowTripPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('attachTripModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowTripPicker(false)}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {availableTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={[styles.tripPickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSelectTripToShare(trip)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: trip.coverImage }} style={styles.tripPickImg} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.tripPickTitle, { color: colors.text }]}>{trip.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      {trip.distanceKm} km • {trip.duration}
                    </Text>
                  </View>
                  <AntDesign name="right" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo URL Input Modal */}
      <Modal visible={showPhotoPrompt} animationType="fade" transparent onRequestClose={() => setShowPhotoPrompt(false)}>
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promptTitle, { color: colors.text }]}>{t('sharePhotoAction')}</Text>
            <TextInput
              style={[styles.promptInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Paste photo image URL (https://...)"
              placeholderTextColor={colors.textMuted}
              value={photoInputUrl}
              onChangeText={setPhotoInputUrl}
            />
            {/* Quick demo photos presets */}
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
              {[
                'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
              ].map((url, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPhotoInputUrl(url)}
                  style={{ borderRadius: 6, overflow: 'hidden' }}
                >
                  <Image source={{ uri: url }} style={{ width: 50, height: 40 }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowPhotoPrompt(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSharePhoto(photoInputUrl)}
                style={[styles.mapsBtn, { backgroundColor: colors.mBlue }]}
              >
                <Text style={styles.mapsBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rider Profile Inspection Modal */}
      <RiderProfileModal
        visible={!!selectedRider}
        onClose={() => setSelectedRider(null)}
        targetUser={selectedRider}
        currentUserId={myId}
        showToast={showToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    padding: 6,
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerSubtitle: {
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  emptyNotice: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyNoticeText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOthers: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginBottom: 2,
  },
  bubbleWrapper: {
    maxWidth: '78%',
  },
  bubbleWrapperMine: {
    alignItems: 'flex-end',
  },
  bubbleWrapperOthers: {
    alignItems: 'flex-start',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
    marginLeft: 4,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aiVerifiedPill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiVerifiedText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  bubbleBody: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 4,
  },
  bubbleBodyMine: {
    borderBottomRightRadius: 3,
  },
  bubbleBodyOthers: {
    borderBottomLeftRadius: 3,
    borderWidth: 1,
  },
  bubbleBodyAi: {
    borderWidth: 1.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUnread: {
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  msgTimeText: {
    fontSize: 9.5,
  },
  ticksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlapTick: {
    marginLeft: -4,
  },
  attachedImage: {
    width: 220,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },
  locationCard: {
    borderRadius: 12,
    padding: 10,
    width: 220,
    gap: 4,
    marginBottom: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationAddress: {
    fontSize: 11,
    lineHeight: 15,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  mapsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tripCard: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 220,
    marginBottom: 4,
  },
  tripCover: {
    width: '100%',
    height: 90,
  },
  tripContent: {
    padding: 8,
    gap: 4,
  },
  tripTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tripBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tripStatPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tripStatText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 36,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  aiThinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginLeft: 36,
  },
  aiThinkingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attachmentDrawer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachOption: {
    alignItems: 'center',
    gap: 6,
  },
  attachCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachToggleBtn: {
    padding: 6,
    borderRadius: 18,
  },
  aiTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  aiAvatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTagBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    maxHeight: 90,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tripPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  tripPickImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  tripPickTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  promptCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
});
