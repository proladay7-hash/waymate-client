import { API_BASE_URL } from '../config/api';
import { UserDto } from './authApi';

export interface PostDto {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mediaUrls: string[];
  tripId?: string;
  locationName?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByUserIds: string[];
  createdAt: string;
}

export interface PostCommentDto {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentId?: string | null;
  rootCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUserName?: string | null;
  likeCount?: number;
  likedByUserIds?: string[];
  createdAt: string;
}

export interface FriendRequestDto {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  requesterBio?: string;
  requestedAt: string;
}

const INITIAL_DEMO_POSTS: PostDto[] = [];
const INITIAL_DEMO_COMMENTS: Record<string, PostCommentDto[]> = {
  'post-1': [
    {
      id: 'comm-101',
      postId: 'post-1',
      authorId: 'rider-alex',
      authorName: 'Alex "Viper" Mercer',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      content: 'Cung đường này qua đèo Khánh Lê mùa này sương mù nhiều không bác?',
      parentId: null,
      rootCommentId: null,
      replyToUserId: null,
      replyToUserName: null,
      likeCount: 3,
      likedByUserIds: ['demo-user-1'],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'comm-102',
      postId: 'post-1',
      authorId: 'rider-sarah',
      authorName: 'Sarah Connor',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      content: '@Alex "Viper" Mercer Đi sáng sớm trước 9h sẽ đỡ sương hơn bác ơi, nhớ kiểm tra phanh và lốp kỹ trước khi đổ đèo nhé!',
      parentId: 'comm-101',
      rootCommentId: 'comm-101',
      replyToUserId: 'rider-alex',
      replyToUserName: 'Alex "Viper" Mercer',
      likeCount: 5,
      likedByUserIds: ['rider-viet'],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'comm-103',
      postId: 'post-1',
      authorId: 'rider-viet',
      authorName: 'Minh Việt ADV',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      content: '@Sarah Connor Chuẩn luôn, vừa rồi đoàn mình cũng qua đèo này tầm 8h sáng đường rất thoáng và khô ráo.',
      parentId: 'comm-102',
      rootCommentId: 'comm-101',
      replyToUserId: 'rider-sarah',
      replyToUserName: 'Sarah Connor',
      likeCount: 2,
      likedByUserIds: [],
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: 'comm-104',
      postId: 'post-1',
      authorId: 'rider-viet',
      authorName: 'Minh Việt ADV',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      content: 'Chiếc xe độ pô và gắn thêm đèn trợ sáng nhìn hầm hố quá! Chúc bạn có chuyến đi thượng lộ bình an 🏍️🔥',
      parentId: null,
      rootCommentId: null,
      replyToUserId: null,
      replyToUserName: null,
      likeCount: 4,
      likedByUserIds: ['demo-user-1'],
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
};

let localPosts: PostDto[] = [];
let localComments: Record<string, PostCommentDto[]> = { ...INITIAL_DEMO_COMMENTS };

/**
 * Fetch social posts for community feed.
 */
export async function fetchCommunityFeed(): Promise<PostDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.log('[SocialApi] Backend offline, using local store');
  }
  return localPosts;
}

/**
 * Create a new social post.
 */
export async function createPostApi(payload: {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mediaUrls?: string[];
  tripId?: string;
  locationName?: string;
}): Promise<PostDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback create post');
  }

  const newPost: PostDto = {
    id: 'post_' + Date.now(),
    authorId: payload.authorId,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    content: payload.content,
    mediaUrls: payload.mediaUrls || [],
    tripId: payload.tripId,
    locationName: payload.locationName,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    likedByUserIds: [],
    createdAt: new Date().toISOString(),
  };
  localPosts.unshift(newPost);
  return newPost;
}

/**
 * Toggle like on a post.
 */
export async function toggleLikePostApi(postId: string, userId: string): Promise<PostDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback toggle like');
  }

  const post = localPosts.find((p) => p.id === postId);
  if (post) {
    const idx = post.likedByUserIds.indexOf(userId);
    if (idx >= 0) {
      post.likedByUserIds.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likedByUserIds.push(userId);
      post.likeCount += 1;
    }
    return { ...post };
  }
  throw new Error('Post not found');
}

/**
 * Fetch comments for a post.
 */
export async function fetchPostComments(postId: string): Promise<PostCommentDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {
    console.log('[SocialApi] Fallback fetch comments');
  }
  return localComments[postId] || [];
}

/**
 * Add a comment or reply to a post.
 */
export async function addPostCommentApi(
  postId: string,
  payload: {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    parentId?: string | null;
    rootCommentId?: string | null;
    replyToUserId?: string | null;
    replyToUserName?: string | null;
  }
): Promise<PostCommentDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback add comment');
  }

  const newComment: PostCommentDto = {
    id: 'comm_' + Date.now(),
    postId,
    authorId: payload.authorId,
    authorName: payload.authorName,
    authorAvatar: payload.authorAvatar,
    content: payload.content,
    parentId: payload.parentId || null,
    rootCommentId: payload.rootCommentId || null,
    replyToUserId: payload.replyToUserId || null,
    replyToUserName: payload.replyToUserName || null,
    likeCount: 0,
    likedByUserIds: [],
    createdAt: new Date().toISOString(),
  };

  if (!localComments[postId]) {
    localComments[postId] = [];
  }
  localComments[postId].push(newComment);

  const post = localPosts.find((p) => p.id === postId);
  if (post) {
    post.commentCount += 1;
  }
  return newComment;
}

/**
 * Toggle like on a comment.
 */
export async function toggleLikeCommentApi(
  postId: string,
  commentId: string,
  userId: string
): Promise<PostCommentDto> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback toggle comment like');
  }

  const postComments = localComments[postId] || [];
  const comment = postComments.find((c) => c.id === commentId);
  if (comment) {
    if (!comment.likedByUserIds) comment.likedByUserIds = [];
    const idx = comment.likedByUserIds.indexOf(userId);
    if (idx >= 0) {
      comment.likedByUserIds.splice(idx, 1);
      comment.likeCount = Math.max(0, (comment.likeCount || 1) - 1);
    } else {
      comment.likedByUserIds.push(userId);
      comment.likeCount = (comment.likeCount || 0) + 1;
    }
    return { ...comment };
  }
  throw new Error('Comment not found');
}

/**
 * Share a post.
 */
export async function sharePostApi(postId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/posts/${postId}/share`, {
      method: 'POST',
    });
  } catch (e) {
    const post = localPosts.find((p) => p.id === postId);
    if (post) {
      post.shareCount += 1;
    }
  }
}

/**
 * Fetch accepted friends.
 */
export async function fetchFriendsApi(userId: string): Promise<UserDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/friends?userId=${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback fetch friends');
  }

  return [
    {
      id: 'rider-alex',
      name: 'Alex "Viper" Mercer',
      email: 'alex.mercer@waymate.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: 'CBR650R Rider | Sài Gòn - Đà Lạt Enthusiast | Trackday Lover',
      point: 1450,
      role: 'PRO_RIDER',
    },
    {
      id: 'rider-sarah',
      name: 'Sarah Connor',
      email: 'sarah.c@waymate.com',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      bio: 'Ducati Monster 821 | Chuyên gia cua đèo miền Trung',
      point: 980,
      role: 'RIDER',
    },
    {
      id: 'rider-viet',
      name: 'Minh Việt ADV',
      email: 'viet.adv@waymate.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      bio: 'BMW R1250GS Adventure | Xuyên Việt & Camping Offroad',
      point: 2100,
      role: 'MASTER_GUIDE',
    },
  ];
}

/**
 * Send friend request.
 */
export async function sendFriendRequestApi(senderId: string, targetUserId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, targetUserId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('[SocialApi] Fallback send friend request');
  }
  return { status: 'PENDING' };
}

/**
 * Check friendship status.
 */
export async function checkFriendshipStatusApi(currentUserId: string, targetUserId: string): Promise<string> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/friends/status?currentUserId=${currentUserId}&targetUserId=${targetUserId}`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.status || 'NONE';
    }
  } catch (e) {
    console.log('[SocialApi] Fallback check friendship');
  }
  return 'NONE';
}

/**
 * Search riders.
 */
export async function searchRidersApi(query: string): Promise<UserDto[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/friends/search?query=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {
    console.log('[SocialApi] Fallback search riders');
  }

  const all = await fetchFriendsApi('demo');
  return all.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );
}
