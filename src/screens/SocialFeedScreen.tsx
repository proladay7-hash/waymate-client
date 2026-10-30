import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { UserDto } from '../services/authApi';
import {
  PostDto,
  PostCommentDto,
  fetchCommunityFeed,
  createPostApi,
  toggleLikePostApi,
  fetchPostComments,
  addPostCommentApi,
  toggleLikeCommentApi,
  sharePostApi,
} from '../services/socialApi';
import { TripData } from '../data/mockTrips';
import { fetchTripsApi } from '../services/tripApi';
import RiderProfileModal from './RiderProfileModal';
import { triggerLocalPhoneNotification } from '../services/notificationService';

function formatPostTime(iso?: string) {
  if (!iso) return '';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

interface SocialFeedScreenProps {
  currentUser: UserDto | null;
  trips?: TripData[];
  savedTripIds?: string[];
  preSelectedTripId?: string | null;
  onClearPreSelectedTrip?: () => void;
  joinRequests?: Record<string, 'pending' | 'accepted'>;
  onRequestJoinTrip?: (tripId: string, tripTitle: string, organizerName: string) => void;
  onNavigateToTrip?: (tripId: string) => void;
  onOpenDirectChat?: (otherUserId: string, otherUserName: string, otherAvatar?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function SocialFeedScreen({
  currentUser,
  trips = [],
  savedTripIds = [],
  preSelectedTripId,
  onClearPreSelectedTrip,
  joinRequests = {},
  onRequestJoinTrip,
  onNavigateToTrip,
  onOpenDirectChat,
  showToast,
}: SocialFeedScreenProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { userLocation } = useUserLocation();

  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);

  // New Post Composer State
  const [composerText, setComposerText] = useState('');
  const [composerMediaUrls, setComposerMediaUrls] = useState<string[]>([]);
  const [composerLocation, setComposerLocation] = useState<string>('');
  const [composerTripId, setComposerTripId] = useState<string>('');
  const [isPosting, setIsPosting] = useState(false);

  // Modals for post attachments
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripPickerTab, setTripPickerTab] = useState<'all' | 'personal' | 'saved'>('personal');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  // Comments Modal State with 2-Level Reply Hierarchy
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<PostCommentDto[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    rootCommentId: string;
    authorId: string;
    authorName: string;
  } | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  const commentInputRef = useRef<any>(null);

  // Group comments: strictly Level 1 (roots) and Level 2 (replies)
  const rootComments = useMemo(() => {
    return comments.filter((c) => !c.parentId);
  }, [comments]);

  const repliesByRootId = useMemo(() => {
    const map: Record<string, PostCommentDto[]> = {};
    const rootIdSet = new Set(rootComments.map((r) => r.id));

    comments.forEach((c) => {
      if (!c.parentId) return;
      let rId = c.rootCommentId;
      if (!rId || !rootIdSet.has(rId)) {
        if (rootIdSet.has(c.parentId)) {
          rId = c.parentId;
        } else {
          const parent = comments.find((p) => p.id === c.parentId);
          rId = parent?.rootCommentId || parent?.parentId || c.parentId;
        }
      }
      if (rId) {
        if (!map[rId]) map[rId] = [];
        map[rId].push(c);
      }
    });

    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return map;
  }, [comments, rootComments]);

  // Rider Profile Modal
  const [selectedRider, setSelectedRider] = useState<UserDto | null>(null);

  const myId = currentUser?.id || 'demo-user-1';
  const myName = currentUser?.name || 'Rider';
  const myAvatar = currentUser?.avatar;

  const [availableTrips, setAvailableTrips] = useState<TripData[]>(trips.length > 0 ? trips : []);
  useEffect(() => {
    if (trips && trips.length > 0) {
      setAvailableTrips(trips);
    } else {
      fetchTripsApi().then(setAvailableTrips);
    }
  }, [trips]);

  useEffect(() => {
    if (preSelectedTripId) {
      setComposerTripId(preSelectedTripId);
      if (onClearPreSelectedTrip) onClearPreSelectedTrip();
      if (showToast) {
        showToast(language === 'VIE' ? 'Đã đính kèm chuyến đi vào bài viết! 🏍️' : 'Trip attached to new post! 🏍️', 'info');
      }
    }
  }, [preSelectedTripId]);

  const personalTrips = useMemo(() => {
    return availableTrips.filter(
      (t) =>
        (t as any).isPersonal ||
        (myId && (t as any).authorId === myId) ||
        (t.riderName && (t.riderName === myName || t.riderName.startsWith('You')))
    );
  }, [availableTrips, myId, myName]);

  const savedTrips = useMemo(() => {
    return availableTrips.filter((t) => savedTripIds.includes(t.id));
  }, [availableTrips, savedTripIds]);

  const modalTripsList = useMemo(() => {
    if (tripPickerTab === 'personal') return personalTrips;
    if (tripPickerTab === 'saved') return savedTrips;
    return availableTrips;
  }, [tripPickerTab, personalTrips, savedTrips, availableTrips]);

  useEffect(() => {
    let isSubscribed = true;
    fetchCommunityFeed()
      .then((feed) => {
        if (isSubscribed) setPosts(feed);
      })
      .catch(() => {})
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Submit Post
  const handleCreatePost = async () => {
    if (!composerText.trim() && composerMediaUrls.length === 0) return;
    setIsPosting(true);
    try {
      const newPost = await createPostApi({
        authorId: myId,
        authorName: myName,
        authorAvatar: myAvatar,
        content: composerText.trim(),
        mediaUrls: composerMediaUrls,
        tripId: composerTripId || undefined,
        locationName: composerLocation || undefined,
      });

      setPosts([newPost, ...posts]);
      setComposerText('');
      setComposerMediaUrls([]);
      setComposerLocation('');
      setComposerTripId('');
      if (showToast) showToast('Post published to Community Feed! 🏍️', 'success');
    } catch {
      // Ignored
    } finally {
      setIsPosting(false);
    }
  };

  // Toggle Like
  const handleToggleLike = async (postId: string) => {
    try {
      const updated = await toggleLikePostApi(postId, myId);
      setPosts(posts.map((p) => (p.id === postId ? updated : p)));
    } catch {
      // Local optimistic update
      setPosts(
        posts.map((p) => {
          if (p.id === postId) {
            const hasLiked = p.likedByUserIds.includes(myId);
            return {
              ...p,
              likeCount: hasLiked ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
              likedByUserIds: hasLiked
                ? p.likedByUserIds.filter((id) => id !== myId)
                : [...p.likedByUserIds, myId],
            };
          }
          return p;
        })
      );
    }
  };

  // Open Comments
  const handleOpenComments = async (postId: string) => {
    setActiveCommentPostId(postId);
    setReplyingTo(null);
    setCommentInput('');
    setLoadingComments(true);
    try {
      const list = await fetchPostComments(postId);
      setComments(list);
    } finally {
      setLoadingComments(false);
    }
  };

  // Reply trigger - sets replyingTo and tags @username in input
  const handleInitiateReply = (comment: PostCommentDto, rootId: string) => {
    setReplyingTo({
      commentId: comment.id,
      rootCommentId: rootId,
      authorId: comment.authorId,
      authorName: comment.authorName,
    });
    const tag = `@${comment.authorName} `;
    if (!commentInput.startsWith(tag)) {
      setCommentInput(tag + commentInput.replace(/^@\S+\s*/, ''));
    }
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    if (commentInput.startsWith('@')) {
      setCommentInput(commentInput.replace(/^@\S+\s*/, ''));
    }
  };

  const toggleRepliesCollapse = (rootId: string) => {
    setCollapsedReplies((prev) => ({
      ...prev,
      [rootId]: !prev[rootId],
    }));
  };

  // Toggle Like on Comment
  const handleToggleCommentLike = async (commentId: string) => {
    if (!activeCommentPostId) return;

    try {
      const updated = await toggleLikeCommentApi(activeCommentPostId, commentId, myId);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const list = c.likedByUserIds || [];
            const liked = list.includes(myId);
            return {
              ...c,
              likeCount: liked ? Math.max(0, (c.likeCount || 1) - 1) : (c.likeCount || 0) + 1,
              likedByUserIds: liked ? list.filter((id) => id !== myId) : [...list, myId],
            };
          }
          return c;
        })
      );
    }
  };

  // Submit Comment or Reply
  const handleAddComment = async () => {
    if (!activeCommentPostId || !commentInput.trim()) return;
    const text = commentInput.trim();
    const currentReply = replyingTo;
    setCommentInput('');
    setReplyingTo(null);

    // Do not push notifications for self-sent replies or comments (avoids annoying "You replied to..." banners)

    try {
      const added = await addPostCommentApi(activeCommentPostId, {
        authorId: myId,
        authorName: myName,
        authorAvatar: myAvatar,
        content: text,
        parentId: currentReply?.commentId || null,
        rootCommentId: currentReply?.rootCommentId || null,
        replyToUserId: currentReply?.authorId || null,
        replyToUserName: currentReply?.authorName || null,
      });

      setComments((prev) => [...prev, added]);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activeCommentPostId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
        )
      );

      // Expand replies under this root
      if (currentReply?.rootCommentId) {
        setCollapsedReplies((prev) => ({ ...prev, [currentReply.rootCommentId]: false }));
      }
    } catch {
      // Ignored
    }
  };

  // Share Post
  const handleSharePost = async (postId: string) => {
    await sharePostApi(postId);
    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, shareCount: p.shareCount + 1 } : p))
    );
    if (showToast) showToast('Post shared with community!', 'info');
  };

  // Attach Current GPS
  const handleAttachLocation = () => {
    if (composerLocation) {
      setComposerLocation('');
    } else {
      const locStr = userLocation ? 'Current GPS Location' : 'Đà Lạt, Lâm Đồng, Vietnam';
      setComposerLocation(locStr);
      if (showToast) showToast('GPS location tagged!', 'info');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Feed Banner Header */}
      <View style={[styles.feedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.feedHeaderRow}>
          <FontAwesome6 name="motorcycle" size={16} color={colors.mBlue} />
          <Text style={[styles.feedHeaderTitle, { color: colors.text }]}>
            {t('communityPostsTitle')}
          </Text>
        </View>
        <Text style={[styles.feedHeaderDesc, { color: colors.textMuted }]}>
          Connect with riders, explore touring routes, and share road adventures.
        </Text>
      </View>

      {/* Post Composer Card */}
      <View style={[styles.composerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.composerHeader}>
          <Image
            source={{
              uri:
                myAvatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            }}
            style={styles.composerAvatar}
          />
          <TextInput
            style={[styles.composerInput, { color: colors.text }]}
            placeholder={t('createPostPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={composerText}
            onChangeText={setComposerText}
            multiline
          />
        </View>

        {/* Selected Attachments Preview */}
        {(composerMediaUrls.length > 0 || !!composerLocation || !!composerTripId) ? (
          <View style={styles.composerAttachmentsRow}>
            {composerLocation ? (
              <View style={[styles.tagPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <FontAwesome6 name="location-dot" size={10} color="#EF4444" />
                <Text style={[styles.tagPillText, { color: '#EF4444' }]}>{composerLocation}</Text>
                <TouchableOpacity onPress={() => setComposerLocation('')}>
                  <AntDesign name="close" size={11} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : null}

            {composerTripId ? (
              <View style={[styles.tagPill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <FontAwesome6 name="route" size={10} color={colors.mBlue} />
                <Text style={[styles.tagPillText, { color: colors.mBlue }]}>Trip attached</Text>
                <TouchableOpacity onPress={() => setComposerTripId('')}>
                  <AntDesign name="close" size={11} color={colors.mBlue} />
                </TouchableOpacity>
              </View>
            ) : null}

            {composerMediaUrls.map((url, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image source={{ uri: url }} style={styles.composerThumb} />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => setComposerMediaUrls(composerMediaUrls.filter((_, i) => i !== idx))}
                >
                  <AntDesign name="close" size={10} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* Composer Actions Toolbar */}
        <View style={[styles.composerToolbar, { borderTopColor: colors.border }]}>
          <View style={styles.composerTools}>
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="image" size={13} color="#10B981" />
              <Text style={[styles.toolBtnText, { color: colors.text }]}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleAttachLocation}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="location-dot" size={13} color="#EF4444" />
              <Text style={[styles.toolBtnText, { color: colors.text }]}>GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowTripModal(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="route" size={13} color={colors.mBlue} />
              <Text style={[styles.toolBtnText, { color: colors.text }]}>Trip</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.publishBtn,
              {
                backgroundColor:
                  composerText.trim() || composerMediaUrls.length > 0
                    ? colors.mBlue
                    : colors.border,
              },
            ]}
            onPress={handleCreatePost}
            disabled={(!composerText.trim() && composerMediaUrls.length === 0) || isPosting}
            activeOpacity={0.8}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishBtnText}>{t('publishPostButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Posts List */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.mBlue} />
        </View>
      ) : (
        posts.map((post) => {
          const hasLiked = post.likedByUserIds?.includes(myId);
          const attachedTrip = post.tripId ? availableTrips.find((t) => t.id === post.tripId) : null;

          return (
            <View
              key={post.id}
              style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Post Author Header */}
              <View style={styles.postAuthorRow}>
                <TouchableOpacity
                  style={styles.authorClickArea}
                  onPress={() =>
                    setSelectedRider({
                      id: post.authorId,
                      name: post.authorName,
                      email: `${post.authorName.toLowerCase().replace(/\s+/g, '')}@waymate.com`,
                      avatar: post.authorAvatar,
                      bio: 'Active WayMate Rider | Adventure Travel',
                      point: 1450,
                      role: 'PRO_RIDER',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Image
                    source={{
                      uri:
                        post.authorAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
                    }}
                    style={styles.authorAvatar}
                  />
                  <View style={styles.authorTextGroup}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
                    <View style={styles.postMetaRow}>
                      <Text style={[styles.postTime, { color: colors.textMuted }]}>
                        {formatPostTime(post.createdAt)}
                      </Text>
                      {post.locationName ? (
                        <View style={styles.locationTag}>
                          <Text style={{ color: colors.textMuted, fontSize: 10 }}>•</Text>
                          <FontAwesome6 name="location-dot" size={9} color="#EF4444" />
                          <Text style={[styles.locationName, { color: colors.textMuted }]}>
                            {post.locationName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    onOpenDirectChat &&
                    onOpenDirectChat(post.authorId, post.authorName, post.authorAvatar)
                  }
                  style={[styles.msgAuthorBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <AntDesign name="message" size={13} color={colors.mBlue} />
                </TouchableOpacity>
              </View>

              {/* Post Body Content */}
              {post.content ? (
                <Text style={[styles.postContentText, { color: colors.text }]}>{post.content}</Text>
              ) : null}

              {/* Media Gallery */}
              {post.mediaUrls && post.mediaUrls.length > 0 ? (
                <View style={styles.mediaContainer}>
                  {post.mediaUrls.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={[
                        styles.postMediaImage,
                        post.mediaUrls.length > 1 && { height: 160, flex: 1 },
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : null}

              {/* Linked Trip Card with Join Request */}
              {attachedTrip ? (
                <View style={[styles.linkedTripContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.linkedTripBox}
                    onPress={() => onNavigateToTrip && onNavigateToTrip(attachedTrip.id)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: attachedTrip.coverImage }} style={styles.linkedTripImg} />
                    <View style={styles.linkedTripInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <FontAwesome6 name="route" size={11} color={colors.mBlue} />
                        <Text style={[styles.linkedTripTitle, { color: colors.text }]} numberOfLines={1}>
                          {attachedTrip.title}
                        </Text>
                      </View>
                      <Text style={[styles.linkedTripDetails, { color: colors.textMuted }]} numberOfLines={1}>
                        {attachedTrip.distanceKm} km • {attachedTrip.duration} • {attachedTrip.riderName}
                      </Text>
                    </View>
                    <AntDesign name="right" size={13} color={colors.textMuted} />
                  </TouchableOpacity>

                  {/* Join Ride Bar */}
                  <View style={[styles.linkedTripJoinBar, { borderTopColor: colors.border }]}>
                    <View style={styles.linkedTripSeatsWrap}>
                      <FontAwesome6 name="users" size={11} color={colors.textMuted} />
                      <Text style={[styles.linkedTripSeatsText, { color: colors.textMuted }]}>
                        {attachedTrip.groupSize || 'Group Ride'}
                      </Text>
                    </View>

                    {post.authorId === myId || attachedTrip.riderName === myName || (attachedTrip as any).isPersonal ? (
                      <View style={[styles.tripOrganizerBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: colors.mBlue }]}>
                        <FontAwesome6 name="crown" size={10} color={colors.mBlue} />
                        <Text style={[styles.tripOrganizerBadgeText, { color: colors.mBlue }]}>
                          {t('yourTripBadge')}
                        </Text>
                      </View>
                    ) : joinRequests[attachedTrip.id] === 'pending' ? (
                      <View style={[styles.tripJoinedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' }]}>
                        <AntDesign name="check" size={11} color="#10B981" />
                        <Text style={[styles.tripJoinedBadgeText, { color: '#10B981' }]}>
                          {t('joinRequestedBadge')}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.requestJoinBtn, { backgroundColor: colors.mRed }]}
                        onPress={() => {
                          if (onRequestJoinTrip) {
                            onRequestJoinTrip(attachedTrip.id, attachedTrip.title, attachedTrip.riderName);
                          } else if (showToast) {
                            showToast(t('joinSlotRequested'), 'success');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <FontAwesome6 name="user-plus" size={11} color="#FFFFFF" />
                        <Text style={styles.requestJoinBtnText}>{t('requestToJoin')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}

              {/* Post Stats & Actions Bar */}
              <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
                {/* Like Button */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleToggleLike(post.id)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6
                    name="heart"
                    size={15}
                    color={hasLiked ? '#EF4444' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.actionCount,
                      { color: hasLiked ? '#EF4444' : colors.textMuted },
                    ]}
                  >
                    {post.likeCount || 0}
                  </Text>
                </TouchableOpacity>

                {/* Comment Button */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleOpenComments(post.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="message" size={15} color={colors.textMuted} />
                  <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                    {post.commentCount || 0}
                  </Text>
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleSharePost(post.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="share-alt" size={15} color={colors.textMuted} />
                  <Text style={[styles.actionCount, { color: colors.textMuted }]}>
                    {post.shareCount || 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Comments Thread Modal with 2-Level Reply Hierarchy */}
      <Modal
        visible={!!activeCommentPostId}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setActiveCommentPostId(null);
          setReplyingTo(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.commentsSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.commentsHeader}>
              <View style={styles.commentsHeaderTitleRow}>
                <FontAwesome6 name="comments" size={16} color={colors.mBlue} />
                <Text style={[styles.commentsTitle, { color: colors.text }]}>{t('commentsModalTitle')}</Text>
                <Text style={[styles.commentsTotalBadge, { color: colors.textMuted }]}>
                  ({comments.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setActiveCommentPostId(null);
                  setReplyingTo(null);
                }}
                activeOpacity={0.7}
              >
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="small" color={colors.mBlue} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView
                style={styles.commentsList}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {rootComments.length === 0 ? (
                  <View style={styles.emptyCommentsBox}>
                    <FontAwesome6 name="comment-dots" size={28} color={colors.textMuted} />
                    <Text style={[styles.emptyComments, { color: colors.textMuted }]}>
                      No comments yet. Be the first to share your thoughts or ask a question!
                    </Text>
                  </View>
                ) : (
                  rootComments.map((root) => {
                    const replies = repliesByRootId[root.id] || [];
                    const isCollapsed = collapsedReplies[root.id] ?? false;
                    const isRootLiked = root.likedByUserIds?.includes(myId);
                    const activePost = posts.find((p) => p.id === activeCommentPostId);

                    return (
                      <View key={root.id} style={styles.rootCommentGroup}>
                        {/* LEVEL 1: Root Comment Card */}
                        <View style={styles.commentItem}>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedRider({
                                id: root.authorId,
                                name: root.authorName,
                                email: `${root.authorId}@waymate.com`,
                                avatar: root.authorAvatar,
                                role: 'RIDER',
                                point: 0,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{
                                uri:
                                  root.authorAvatar ||
                                  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
                              }}
                              style={styles.commentAvatar}
                            />
                          </TouchableOpacity>

                          <View style={{ flex: 1 }}>
                            <View style={[styles.commentBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                              <View style={styles.commentHeaderRow}>
                                <View style={styles.authorBadgeRow}>
                                  <Text style={[styles.commentAuthor, { color: colors.text }]}>{root.authorName}</Text>
                                  {activePost?.authorId === root.authorId && (
                                    <View style={[styles.authorPill, { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue }]}>
                                      <Text style={[styles.authorPillText, { color: colors.mBlue }]}>{t('postAuthorBadge')}</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                                  {formatPostTime(root.createdAt)}
                                </Text>
                              </View>
                              <Text style={[styles.commentText, { color: colors.text }]}>{root.content}</Text>
                            </View>

                            {/* Level 1 Actions */}
                            <View style={styles.commentActionRow}>
                              <TouchableOpacity
                                style={styles.commentActionBtn}
                                onPress={() => handleToggleCommentLike(root.id)}
                                activeOpacity={0.7}
                              >
                                <FontAwesome6
                                  name="heart"
                                  size={11}
                                  color={isRootLiked ? '#EF4444' : colors.textMuted}
                                />
                                {(root.likeCount || 0) > 0 && (
                                  <Text
                                    style={[
                                      styles.commentActionCount,
                                      { color: isRootLiked ? '#EF4444' : colors.textMuted },
                                    ]}
                                  >
                                    {root.likeCount}
                                  </Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.commentActionBtn}
                                onPress={() => handleInitiateReply(root, root.id)}
                                activeOpacity={0.7}
                              >
                                <FontAwesome6 name="reply" size={11} color={colors.mBlue} />
                                <Text style={[styles.commentActionText, { color: colors.mBlue }]}>{t('replyAction')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        {/* LEVEL 2: Replies Hierarchy (strictly 1 nested level under root) */}
                        {replies.length > 0 && (
                          <View style={styles.repliesSection}>
                            {isCollapsed ? (
                              <TouchableOpacity
                                style={styles.viewRepliesBtn}
                                onPress={() => toggleRepliesCollapse(root.id)}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.replyLinePreview, { backgroundColor: colors.border }]} />
                                <Text style={[styles.viewRepliesText, { color: colors.mBlue }]}>
                                  ── {t('viewReplies')} {replies.length} {t('repliesCount')}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.repliesThreadContainer}>
                                <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
                                <View style={{ flex: 1, gap: 10 }}>
                                  {replies.map((reply) => {
                                    const isReplyLiked = reply.likedByUserIds?.includes(myId);
                                    return (
                                      <View key={reply.id} style={styles.replyItem}>
                                        <TouchableOpacity
                                          onPress={() =>
                                            setSelectedRider({
                                              id: reply.authorId,
                                              name: reply.authorName,
                                              email: `${reply.authorId}@waymate.com`,
                                              avatar: reply.authorAvatar,
                                              role: 'RIDER',
                                              point: 0,
                                            })
                                          }
                                          activeOpacity={0.8}
                                        >
                                          <Image
                                            source={{
                                              uri:
                                                reply.authorAvatar ||
                                                'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
                                            }}
                                            style={styles.replyAvatar}
                                          />
                                        </TouchableOpacity>

                                        <View style={{ flex: 1 }}>
                                          <View
                                            style={[
                                              styles.replyBubble,
                                              { backgroundColor: colors.card, borderColor: colors.border },
                                            ]}
                                          >
                                            <View style={styles.commentHeaderRow}>
                                              <View style={styles.authorBadgeRow}>
                                                <Text style={[styles.commentAuthor, { color: colors.text, fontSize: 12 }]}>
                                                  {reply.authorName}
                                                </Text>
                                                {activePost?.authorId === reply.authorId && (
                                                  <View
                                                    style={[
                                                      styles.authorPill,
                                                      { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue },
                                                    ]}
                                                  >
                                                    <Text style={[styles.authorPillText, { color: colors.mBlue }]}>
                                                      {t('postAuthorBadge')}
                                                    </Text>
                                                  </View>
                                                )}
                                              </View>
                                              <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                                                {formatPostTime(reply.createdAt)}
                                              </Text>
                                            </View>

                                            {/* Tag badge */}
                                            {reply.replyToUserName ? (
                                              <View style={styles.replyingToBadge}>
                                                <Text style={[styles.replyingToBadgeText, { color: colors.mBlue }]}>
                                                  @{reply.replyToUserName}
                                                </Text>
                                              </View>
                                            ) : null}

                                            <Text style={[styles.commentText, { color: colors.text }]}>{reply.content}</Text>
                                          </View>

                                          {/* Level 2 Actions */}
                                          <View style={styles.commentActionRow}>
                                            <TouchableOpacity
                                              style={styles.commentActionBtn}
                                              onPress={() => handleToggleCommentLike(reply.id)}
                                              activeOpacity={0.7}
                                            >
                                              <FontAwesome6
                                                name="heart"
                                                size={10}
                                                color={isReplyLiked ? '#EF4444' : colors.textMuted}
                                              />
                                              {(reply.likeCount || 0) > 0 && (
                                                <Text
                                                  style={[
                                                    styles.commentActionCount,
                                                    { color: isReplyLiked ? '#EF4444' : colors.textMuted, fontSize: 10 },
                                                  ]}
                                                >
                                                  {reply.likeCount}
                                                </Text>
                                              )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                              style={styles.commentActionBtn}
                                              onPress={() => handleInitiateReply(reply, root.id)}
                                              activeOpacity={0.7}
                                            >
                                              <FontAwesome6 name="reply" size={10} color={colors.mBlue} />
                                              <Text style={[styles.commentActionText, { color: colors.mBlue, fontSize: 11 }]}>
                                                {t('replyAction')}
                                              </Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                      </View>
                                    );
                                  })}

                                  {replies.length > 2 && (
                                    <TouchableOpacity
                                      style={styles.hideRepliesBtn}
                                      onPress={() => toggleRepliesCollapse(root.id)}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={[styles.hideRepliesText, { color: colors.textMuted }]}>
                                        {t('hideReplies')}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Replying Banner */}
            {replyingTo ? (
              <View
                style={[
                  styles.replyingToBar,
                  { backgroundColor: colors.surfaceElevated, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.replyingToInfo}>
                  <FontAwesome6 name="reply" size={11} color={colors.mBlue} />
                  <Text style={[styles.replyingToText, { color: colors.textMuted }]}>
                    {t('replyingTo')}{' '}
                    <Text style={{ color: colors.mBlue, fontWeight: '700' }}>@{replyingTo.authorName}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCancelReply} style={styles.cancelReplyBtn} activeOpacity={0.7}>
                  <AntDesign name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Comment Input */}
            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
              <TextInput
                ref={commentInputRef}
                style={[
                  styles.commentInputField,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                placeholder={
                  replyingTo
                    ? `${t('replyingTo')} @${replyingTo.authorName}...`
                    : t('writeCommentPlaceholder')
                }
                placeholderTextColor={colors.textMuted}
                value={commentInput}
                onChangeText={setCommentInput}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentBtn,
                  { backgroundColor: commentInput.trim() ? colors.mBlue : colors.border },
                ]}
                onPress={handleAddComment}
                disabled={!commentInput.trim()}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="arrow-up" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Trip Picker Modal */}
      <Modal visible={showTripModal} animationType="slide" transparent onRequestClose={() => setShowTripModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome6 name="route" size={15} color={colors.mBlue} />
                <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('attachTripToPost')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTripModal(false)}>
                <AntDesign name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Segmented Tabs in Modal */}
            <View style={[styles.modalTabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.modalTabPill,
                  tripPickerTab === 'personal' && [styles.modalTabPillActive, { backgroundColor: colors.mBlue }],
                ]}
                onPress={() => setTripPickerTab('personal')}
              >
                <Text
                  style={[
                    styles.modalTabPillText,
                    { color: tripPickerTab === 'personal' ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  {t('personalTrips')} ({personalTrips.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTabPill,
                  tripPickerTab === 'saved' && [styles.modalTabPillActive, { backgroundColor: colors.mRed }],
                ]}
                onPress={() => setTripPickerTab('saved')}
              >
                <Text
                  style={[
                    styles.modalTabPillText,
                    { color: tripPickerTab === 'saved' ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  {t('savedTrips')} ({savedTrips.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTabPill,
                  tripPickerTab === 'all' && [styles.modalTabPillActive, { backgroundColor: colors.surfaceElevated }],
                ]}
                onPress={() => setTripPickerTab('all')}
              >
                <Text
                  style={[
                    styles.modalTabPillText,
                    { color: tripPickerTab === 'all' ? colors.text : colors.textMuted },
                  ]}
                >
                  {t('exploreTrips')}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {modalTripsList.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center', gap: 6 }}>
                  <FontAwesome6 name="route" size={24} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {tripPickerTab === 'personal'
                      ? t('noPersonalTrips')
                      : tripPickerTab === 'saved'
                      ? t('noSavedTrips')
                      : 'No trips available'}
                  </Text>
                </View>
              ) : (
                modalTripsList.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.tripPickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      setComposerTripId(trip.id);
                      setShowTripModal(false);
                    }}
                  >
                    <Image source={{ uri: trip.coverImage }} style={styles.tripPickImg} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripPickTitle, { color: colors.text }]}>{trip.title}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {trip.distanceKm} km • {trip.duration} • {trip.riderName}
                      </Text>
                    </View>
                    <AntDesign name="check" size={14} color={composerTripId === trip.id ? colors.mBlue : 'transparent'} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Photo Picker Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent onRequestClose={() => setShowPhotoModal(false)}>
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promptTitle, { color: colors.text }]}>Attach Photo to Post</Text>
            <TextInput
              style={[styles.promptInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Paste photo URL (https://...)"
              placeholderTextColor={colors.textMuted}
              value={photoUrlInput}
              onChangeText={setPhotoUrlInput}
            />
            {/* Quick Presets */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
              {[
                'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
              ].map((url, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPhotoUrlInput(url)}
                  style={{ borderRadius: 6, overflow: 'hidden' }}
                >
                  <Image source={{ uri: url }} style={{ width: 55, height: 45 }} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (photoUrlInput.trim()) {
                    setComposerMediaUrls([...composerMediaUrls, photoUrlInput.trim()]);
                    setPhotoUrlInput('');
                    setShowPhotoModal(false);
                  }
                }}
                style={[styles.publishBtn, { backgroundColor: colors.mBlue }]}
              >
                <Text style={styles.publishBtnText}>Attach</Text>
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
        onOpenDirectChat={onOpenDirectChat}
        showToast={showToast}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  feedHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  feedHeaderDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  composerCard: {
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  composerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  composerInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 50,
    paddingTop: 4,
  },
  composerAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbWrapper: {
    position: 'relative',
  },
  composerThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  composerTools: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  publishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  centerLoading: {
    marginVertical: 40,
    alignItems: 'center',
  },
  postCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  postAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorClickArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorTextGroup: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  postTime: {
    fontSize: 11,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationName: {
    fontSize: 11,
  },
  msgAuthorBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  postContentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediaContainer: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postMediaImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  linkedTripBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  linkedTripImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  linkedTripInfo: {
    flex: 1,
    gap: 2,
  },
  linkedTripTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkedTripDetails: {
    fontSize: 11,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 16,
    maxHeight: '85%',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentsHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  commentsTotalBadge: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentsList: {
    maxHeight: 380,
  },
  emptyCommentsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyComments: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  rootCommentGroup: {
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  authorPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  authorPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  commentTime: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentActionCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  repliesSection: {
    marginLeft: 26,
    marginTop: 6,
  },
  repliesThreadContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  threadLine: {
    width: 2,
    borderRadius: 1,
    marginVertical: 4,
    opacity: 0.6,
  },
  replyItem: {
    flexDirection: 'row',
    gap: 8,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  replyBubble: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  replyingToBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginBottom: 3,
  },
  replyingToBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  replyLinePreview: {
    width: 16,
    height: 1.5,
  },
  viewRepliesText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hideRepliesBtn: {
    paddingVertical: 2,
  },
  hideRepliesText: {
    fontSize: 11,
    fontWeight: '600',
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  replyingToInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyingToText: {
    fontSize: 11.5,
  },
  cancelReplyBtn: {
    padding: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  commentInputField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    maxHeight: 80,
  },
  sendCommentBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '800',
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
  linkedTripContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkedTripJoinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  linkedTripSeatsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedTripSeatsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tripOrganizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tripOrganizerBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  tripJoinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tripJoinedBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  requestJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  requestJoinBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalTabRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  modalTabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalTabPillActive: {},
  modalTabPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
