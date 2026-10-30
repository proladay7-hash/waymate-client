import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import TopBar, { ScreenId } from './src/components/TopBar';
import BottomNav from './src/components/BottomNav';
import SocialFeedScreen from './src/screens/SocialFeedScreen';
import TripsScreen from './src/screens/TripsScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import { Vehicle } from './src/data/mockVehicles';
import { TripData } from './src/data/mockTrips';
import { fetchTripsApi, createTripApi } from './src/services/tripApi';
import { UserDto, setAuthToken } from './src/services/authApi';
import { ChatRoomDto, getOrCreateDirectRoom, fetchUserRooms } from './src/services/chatApi';
import { chatWs } from './src/services/chatWs';
import {
  fetchVehiclesWithMaintenance,
  createVehicleApi,
  updateVehicleApi,
  deleteVehicleApi,
  createMaintenanceHistoryApi,
} from './src/services/vehicleApi';
import LaunchLoadingScreen from './src/components/LaunchLoadingScreen';
import * as Notifications from 'expo-notifications';
import AIChatModal from './src/components/AIChatModal';
import DraggableFloatingActions from './src/components/DraggableFloatingActions';
import SosEmergencyModal from './src/components/SosEmergencyModal';
import NotificationModal from './src/components/NotificationModal';
import SosDetailScreen from './src/screens/SosDetailScreen';
import { SosResponseDto } from './src/services/sosApi';
import {
  requestNotificationPermission,
  fetchUnreadCountApi,
  triggerLocalPhoneNotification,
} from './src/services/notificationService';

export type ToastType = 'success' | 'info' | 'error';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors, isDark, toggleTheme } = useTheme();

  // Authentication State: DEFAULT FIRST COME IN IS LOGIN PAGE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('login');

  // First Launch Loading Screen State
  const [isFirstLaunchLoading, setIsFirstLaunchLoading] = useState(true);

  // AI Agent Chatbot Modal State
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);

  // SOS Emergency & Notifications State
  const [isSosModalVisible, setIsSosModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedSosId, setSelectedSosId] = useState<string | undefined>(undefined);
  const [selectedSosData, setSelectedSosData] = useState<Partial<SosResponseDto> | null>(null);

  // Request phone notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Request notification permissions on startup and listen for notifications
  useEffect(() => {
    requestNotificationPermission();

    let sub: any;
    try {
      if (Notifications && typeof Notifications.addNotificationResponseReceivedListener === 'function') {
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = (response.notification.request.content.data || {}) as Record<string, any>;
          if (data?.type === 'SOS' || data?.sosId) {
            const sosId = (data.sosId as string) || 'sos-demo-1';
            setSelectedSosId(sosId);
            setSelectedSosData({
              id: sosId,
              name: response.notification.request.content.title || 'Emergency Roadside Alert',
              location: data.location || 'Current GPS Location',
              latitude: typeof data.lat === 'number' ? data.lat : 11.9056,
              longitude: typeof data.lng === 'number' ? data.lng : 108.4412,
              phoneNumber: data.phone || '0901234567',
              bikeInfo: data.bikeInfo || 'Motorcycle (Plate details not registered)',
              userName: data.senderName || 'Rider in Need',
              userAvatar: data.senderAvatar,
            });
            setCurrentScreen('sosdetail');
          } else if (data?.roomId) {
            setCurrentScreen('chat');
          }
        });
      }
    } catch (e) {
      console.log('[App] Notification listener deferred:', e);
    }
    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, []);

  // Poll / refresh unread notification count when user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCountApi(currentUser.id).then(setUnreadNotificationCount);
      const interval = setInterval(() => {
        fetchUnreadCountApi(currentUser.id).then(setUnreadNotificationCount);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Vehicles & Maintenance Tracker State (loaded dynamically from Neo4j)
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Trips Feed & Google Maps Destinations State (loaded dynamically from Neo4j)
  const [trips, setTrips] = useState<TripData[]>([]);

  // Selected Trip & Saved favorites
  const [selectedTripId, setSelectedTripId] = useState<string>('trip-1');
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [attachedTripForFeed, setAttachedTripForFeed] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<Record<string, 'pending' | 'accepted'>>({});

  // Load adventure trips from Neo4j database on mount
  useEffect(() => {
    fetchTripsApi().then((data) => {
      setTrips(data);
      if (data.length > 0) {
        setSelectedTripId(data[0].id);
      }
    });
  }, []);

  // Active Chat Room State (for entering 1-on-1 or group chat)
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoomDto | null>(null);

  // Unread chat messages counter for bottom tab bar
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Refs to read latest active room and screen inside listener without re-binding
  const activeChatRoomRef = useRef<ChatRoomDto | null>(null);
  activeChatRoomRef.current = activeChatRoom;
  const currentScreenRef = useRef<ScreenId>(currentScreen);
  currentScreenRef.current = currentScreen;
  const processedChatMsgIdsRef = useRef<Set<string>>(new Set());

  // Connect / disconnect WebSocket on authentication state change & track unread messages
  useEffect(() => {
    if (currentUser) {
      requestNotificationPermission();
      chatWs.connect(currentUser.id, currentUser.name);

      // Load initial unread messages count across user's rooms
      fetchUserRooms(currentUser.id).then((rooms: ChatRoomDto[]) => {
        const total = rooms.reduce((acc: number, r: ChatRoomDto) => acc + (r.unreadCount || 0), 0);
        setUnreadChatCount(total);
      });

      // Increment unread count on incoming messages from others & trigger phone push notification
      const removeMsgListener = chatWs.addMessageListener((incoming) => {
        if (!incoming || !incoming.id) return;

        // Deduplication: prevent counting or notifying the exact same message packet multiple times
        if (processedChatMsgIdsRef.current.has(incoming.id)) {
          return;
        }
        processedChatMsgIdsRef.current.add(incoming.id);
        if (processedChatMsgIdsRef.current.size > 300) {
          const first = processedChatMsgIdsRef.current.values().next().value;
          if (first) processedChatMsgIdsRef.current.delete(first);
        }

        const senderIdStr = String(incoming.senderId || '').trim().toLowerCase();
        const currentUserIdStr = String(currentUser?.id || '').trim().toLowerCase();

        // 1. NEVER count or push notifications for user's OWN sent messages
        if (senderIdStr && currentUserIdStr && senderIdStr === currentUserIdStr) {
          return;
        }

        // 2. Check if user is currently inside this active conversation screen
        const isViewing =
          currentScreenRef.current === 'chat' &&
          Boolean(
            activeChatRoomRef.current?.id &&
            String(activeChatRoomRef.current.id).trim().toLowerCase() === String(incoming.roomId || '').trim().toLowerCase()
          );

        if (!isViewing) {
          setUnreadChatCount((prev) => prev + 1);

          // Push notification on user's phone ONLY from OTHER users
          const snippet =
            incoming.content ||
            (incoming.type === 'IMAGE'
              ? '📷 Sent a photo'
              : incoming.type === 'LOCATION'
              ? '📍 Shared a GPS location'
              : incoming.type === 'TRIP'
              ? '🏍️ Shared a trip'
              : 'Sent an attachment');

          triggerLocalPhoneNotification(
            incoming.senderName || 'Rider',
            snippet,
            {
              roomId: incoming.roomId,
              messageId: incoming.id,
              senderId: incoming.senderId,
              senderName: incoming.senderName,
              senderAvatar: incoming.senderAvatar,
            },
            'chat-messages',
            incoming.senderAvatar
          );
        }
      });

      // Listen to real-time emergency SOS alerts from other riders
      const removeSosListener = chatWs.addSosListener((sos) => {
        const sosSenderStr = String(sos.senderId || '').trim().toLowerCase();
        const currentUserIdStr = String(currentUser?.id || '').trim().toLowerCase();
        if (sosSenderStr && currentUserIdStr && sosSenderStr === currentUserIdStr) {
          return; // NEVER notify user of their own SOS
        }

        // 1. Instantly increment the notification bell count badge
        setUnreadNotificationCount((prev) => prev + 1);

        // 2. Immediately trigger heads-up push notification banner on user's phone
        const alertTitle = `🚨 SOS: ${sos.name || 'Emergency Assistance'}`;
        const alertBody = `${sos.senderName || 'Nearby Rider'} needs help near ${sos.location || 'your area'}: "${sos.description || 'Assistance requested'}"`;

        triggerLocalPhoneNotification(
          alertTitle,
          alertBody,
          {
            type: 'SOS',
            sosId: sos.id,
            lat: Number(sos.latitude) || 11.9404,
            lng: Number(sos.longitude) || 108.4583,
            location: sos.location || 'Current GPS Location',
            phone: sos.phoneNumber || '0901234567',
            bikeInfo: sos.bikeInfo || 'Motorcycle',
            senderName: sos.senderName || 'Rider in Need',
            senderAvatar: sos.senderAvatar,
          },
          'emergency-sos',
          sos.senderAvatar
        );

        // 3. Show prominent toast
        showToast(`🚨 ${sos.senderName || 'Rider'} sent an emergency SOS near ${sos.location || 'your location'}!`, 'error');
      });

      return () => {
        removeMsgListener();
        removeSosListener();
      };
    } else {
      chatWs.disconnect();
      setUnreadChatCount(0);
    }
  }, [currentUser]);

  const handleOpenDirectChat = async (otherUserId: string, otherUserName: string, otherAvatar?: string) => {
    if (!currentUser) return;
    try {
      const room = await getOrCreateDirectRoom(currentUser.id, otherUserId);
      setActiveChatRoom(room);
      setCurrentScreen('chat');
    } catch (e) {
      console.warn('[App] Failed to open direct chat:', e);
    }
  };

  // Global Animated Toast Banner
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [toastAnim] = useState(() => new Animated.Value(0));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    toastTimerRef.current = setTimeout(() => {
      hideToast();
    }, 3200);
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  // Auth flow callbacks
  const handleLoginSuccess = (user?: UserDto) => {
    if (user) {
      setCurrentUser(user);
    }
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
    showToast('Logged out successfully', 'info');
  };

  // Vehicle management & Neo4j sync
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);

  // Load vehicles from Neo4j when user logs in or currentUser changes
  const loadUserVehicles = async (userId: string) => {
    setIsVehiclesLoading(true);
    try {
      const data = await fetchVehiclesWithMaintenance(userId);
      setVehicles(data);
    } catch (err: any) {
      console.warn('[App] Failed to load vehicles from Neo4j:', err.message);
    } finally {
      setIsVehiclesLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadUserVehicles(currentUser.id);
    }
  }, [currentUser?.id]);

  const handleAddVehicle = async (newVeh: Vehicle) => {
    // Optimistic UI update
    setVehicles((prev) => [newVeh, ...prev]);

    if (!currentUser?.id) return;
    try {
      const created = await createVehicleApi(currentUser.id, {
        name: newVeh.name,
        brand: newVeh.brand,
        plateNumber: newVeh.plateNumber,
        odo: newVeh.currentOdoKm,
        date: newVeh.year,
        capacity: newVeh.capacity || (newVeh.type === 'bike' ? 300 : 1500),
      });

      // If initial service record exists, create it in Neo4j
      if (newVeh.serviceHistory && newVeh.serviceHistory.length > 0) {
        const initRec = newVeh.serviceHistory[0];
        try {
          await createMaintenanceHistoryApi(created.id, {
            name: initRec.serviceItem,
            location: initRec.notes || 'WayMate Garage',
            total: 0,
            maintenanceRequests: [
              {
                name: initRec.serviceItem,
                price: 0,
              },
            ],
          });
        } catch (mErr: any) {
          console.warn('[App] Failed to create initial maintenance in Neo4j:', mErr.message);
        }
      }

      await loadUserVehicles(currentUser.id);
    } catch (err: any) {
      console.error('[App] Failed to create vehicle in Neo4j:', err.message);
      showToast('Could not sync vehicle to server, saved locally', 'info');
    }
  };

  const handleUpdateVehicle = async (updatedVeh: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v))
    );

    try {
      await updateVehicleApi({
        id: updatedVeh.id,
        name: updatedVeh.name,
        brand: updatedVeh.brand,
        plateNumber: updatedVeh.plateNumber,
        odo: updatedVeh.currentOdoKm,
        date: updatedVeh.year,
      });
    } catch (err: any) {
      console.warn('[App] Failed to sync vehicle update to Neo4j:', err.message);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    try {
      await deleteVehicleApi(vehicleId);
      showToast(t('vehicleDeletedSuccess'), 'info');
    } catch (err: any) {
      console.warn('[App] Failed to delete vehicle from Neo4j:', err.message);
    }
  };

  // Toggle favorite saved trip
  const handleToggleSaveTrip = (tripId: string) => {
    if (savedTripIds.includes(tripId)) {
      setSavedTripIds((prev) => prev.filter((id) => id !== tripId));
      showToast(t('removedFavorite'), 'info');
    } else {
      setSavedTripIds((prev) => [...prev, tripId]);
      showToast(t('savedFavorite'), 'success');
    }
  };

  // Trips management & Add New Trip to database
  const handleAddTrip = async (newTrip: TripData) => {
    try {
      const saved = await createTripApi(newTrip);
      setTrips((prev) => [saved, ...prev]);
      showToast(t('tripPostedSuccess'), 'success');
    } catch {
      setTrips((prev) => [newTrip, ...prev]);
      showToast(t('tripPostedSuccess'), 'success');
    }
  };

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setCurrentScreen('trip');
  };

  const handleAttachTripToPost = (tripId: string) => {
    setAttachedTripForFeed(tripId);
    setCurrentScreen('home');
  };

  const handleRequestJoinTrip = (tripId: string, tripTitle: string, organizerName: string) => {
    setJoinRequests((prev) => ({ ...prev, [tripId]: 'pending' }));
    showToast(t('joinSlotRequested'), 'success');
    triggerLocalPhoneNotification(
      '🏍️ Trip Join Request Sent',
      `Your request to join "${tripTitle}" was sent to ${organizerName}.`
    );
  };

  // Back handler based on current active screen
  const handleBack = () => {
    if (currentScreen === 'chat' && activeChatRoom) {
      setActiveChatRoom(null);
    } else if (currentScreen === 'chat') {
      setCurrentScreen('home');
    } else if (currentScreen === 'trip') {
      setCurrentScreen('trips');
    } else if (currentScreen === 'trips') {
      setCurrentScreen('home');
    } else if (currentScreen === 'sosdetail') {
      setCurrentScreen('home');
    } else if (currentScreen === 'forgot') {
      setCurrentScreen('login');
    } else if (currentScreen === 'changepwd') {
      setCurrentScreen('profile');
    }
  };

  const isInsideChatRoom = currentScreen === 'chat' && !!activeChatRoom;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* BMW S1000RR Ambient Glow Background Effects */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.ambientGlow, styles.glowBlue, { backgroundColor: colors.ambientGlowBlue }]} />
        <View style={[styles.ambientGlow, styles.glowRed, { backgroundColor: colors.ambientGlowRed }]} />
        <View style={[styles.ambientGlow, styles.glowNavy, { backgroundColor: colors.ambientGlowNavy }]} />
      </View>

      {/* Header Bar - Hidden in active chat room which has its own dedicated header */}
      {!isInsideChatRoom && (
        <TopBar
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onBack={handleBack}
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          onOpenChat={() => setIsChatModalVisible(true)}
          onOpenNotifications={() => setIsNotificationModalVisible(true)}
          unreadNotificationCount={unreadNotificationCount}
          showToast={showToast}
        />
      )}

      {/* Screen Body - Exactly 1 page visible at a time */}
      <View style={styles.bodyContainer}>
        {/* Unauthenticated / Auth Screens */}
        {!isLoggedIn && currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToForgot={() => setCurrentScreen('forgot')}
            showToast={showToast}
          />
        )}

        {currentScreen === 'forgot' && (
          <ForgotPasswordScreen
            onBackToLogin={() => setCurrentScreen('login')}
            showToast={showToast}
          />
        )}

        {/* Authenticated Screens */}
        {isLoggedIn && currentScreen === 'home' && (
          <SocialFeedScreen
            currentUser={currentUser}
            trips={trips}
            savedTripIds={savedTripIds}
            preSelectedTripId={attachedTripForFeed}
            onClearPreSelectedTrip={() => setAttachedTripForFeed(null)}
            joinRequests={joinRequests}
            onRequestJoinTrip={handleRequestJoinTrip}
            onNavigateToTrip={handleSelectTrip}
            onOpenDirectChat={(otherUserId, otherUserName, otherAvatar) => {
              handleOpenDirectChat(otherUserId, otherUserName, otherAvatar);
            }}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'trips' && (
          <TripsScreen
            trips={trips}
            currentUser={currentUser}
            onAddTrip={handleAddTrip}
            onSelectTrip={handleSelectTrip}
            onAttachToPost={handleAttachTripToPost}
            savedTripIds={savedTripIds}
            onToggleSaveTrip={handleToggleSaveTrip}
            joinRequests={joinRequests}
            onRequestJoinTrip={handleRequestJoinTrip}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'trip' && (
          <TripDetailScreen
            tripId={selectedTripId}
            trips={trips}
            onBack={() => setCurrentScreen('trips')}
            savedTripIds={savedTripIds}
            onToggleSaveTrip={handleToggleSaveTrip}
            onAttachToPost={handleAttachTripToPost}
            onRequestJoinTrip={handleRequestJoinTrip}
            joinRequests={joinRequests}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'vehicles' && (
          <VehiclesScreen
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onRefreshVehicles={() => (currentUser?.id ? loadUserVehicles(currentUser.id) : Promise.resolve())}
            isRefreshing={isVehiclesLoading}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            trips={trips}
            onNavigateToTrip={handleSelectTrip}
            onNavigateToVehicles={() => setCurrentScreen('vehicles')}
            onNavigateToChangePwd={() => setCurrentScreen('changepwd')}
            onLogout={handleLogout}
            savedTripIds={savedTripIds}
            vehicles={vehicles}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'changepwd' && (
          <ChangePasswordScreen
            userEmail={currentUser?.email}
            onBack={() => setCurrentScreen('profile')}
            showToast={showToast}
          />
        )}

        {/* Real-time Messenger / Chat System */}
        {isLoggedIn && currentScreen === 'chat' && (
          activeChatRoom ? (
            <ChatRoomScreen
              room={activeChatRoom}
              currentUser={currentUser}
              onBack={() => setActiveChatRoom(null)}
              onNavigateToTrip={handleSelectTrip}
              showToast={showToast}
            />
          ) : (
            <ChatListScreen
              currentUser={currentUser}
              onSelectRoom={(room) => {
                setActiveChatRoom(room);
                setUnreadChatCount((prev) => Math.max(0, prev - (room.unreadCount || 0)));
              }}
              onUnreadCountSync={(total) => {
                setUnreadChatCount(total);
              }}
              showToast={showToast}
            />
          )
        )}

        {/* Emergency SOS Details Screen */}
        {isLoggedIn && currentScreen === 'sosdetail' && (
          <SosDetailScreen
            sosId={selectedSosId}
            initialSosData={selectedSosData}
            currentUser={currentUser}
            onBack={handleBack}
            onOpenDirectChat={(otherUserId, otherUserName, otherAvatar) => {
              handleOpenDirectChat(otherUserId, otherUserName, otherAvatar);
            }}
            showToast={showToast}
          />
        )}
      </View>

      {/* Persistent Bottom App Navigation Bar (Hidden when inside active chat conversation) */}
      {isLoggedIn && !isInsideChatRoom && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            setCurrentScreen(screen);
          }}
          unreadChatCount={unreadChatCount}
        />
      )}

      {/* Floating Animated Toast Banner */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top, 20) + 55,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.toastBubble,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: toast.type === 'success' ? colors.mBlue : colors.mRed,
              },
            ]}
          >
            <AntDesign
              name={toast.type === 'success' ? 'check-circle' : 'info-circle'}
              size={15}
              color={toast.type === 'success' ? colors.mBlue : colors.mRed}
            />
            <Text style={[styles.toastMessage, { color: colors.text }]} numberOfLines={2}>
              {toast.message}
            </Text>
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AntDesign name="close" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Draggable & Collapsible Floating Actions (Hidden inside active chat room) */}
      {isLoggedIn && !isInsideChatRoom && (
        <DraggableFloatingActions
          onPressChat={() => setIsChatModalVisible(true)}
          onPressSos={() => setIsSosModalVisible(true)}
          unreadChatCount={unreadChatCount}
        />
      )}

      {/* Emergency SOS Roadside Assistance Modal */}
      <SosEmergencyModal
        visible={isSosModalVisible}
        onClose={() => setIsSosModalVisible(false)}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* User Notification Center Modal */}
      <NotificationModal
        visible={isNotificationModalVisible}
        onClose={() => {
          setIsNotificationModalVisible(false);
          if (currentUser) {
            fetchUnreadCountApi(currentUser.id).then(setUnreadNotificationCount);
          }
        }}
        currentUser={currentUser}
        onSelectNotification={(notif) => {
          setIsNotificationModalVisible(false);
          if (notif.type === 'CHAT_MESSAGE') {
            setCurrentScreen('chat');
          } else if (notif.type === 'SOS') {
            let meta: any = {};
            try {
              if (notif.metadataJson) meta = JSON.parse(notif.metadataJson);
            } catch (e) {}

            const sosId = meta.sosId || notif.referenceId || 'sos-demo-1';
            setSelectedSosId(sosId);
            setSelectedSosData({
              id: sosId,
              name: notif.title.replace(/^🚨\s*(SOS EMERGENCY:\s*)?/i, ''),
              userName: notif.senderName || 'Rider in Need',
              userAvatar: notif.senderAvatar,
              location: meta.location || 'Current GPS Location',
              latitude: typeof meta.lat === 'number' ? meta.lat : 11.9056,
              longitude: typeof meta.lng === 'number' ? meta.lng : 108.4412,
              phoneNumber: meta.phone || '0901234567',
              bikeInfo: meta.bikeInfo || 'Motorcycle (Plate details not registered)',
              distanceKm: typeof meta.distanceKm === 'number' ? meta.distanceKm : 3.2,
              description: notif.content,
              createdAt: notif.createdAt,
            });
            setCurrentScreen('sosdetail');
          } else {
            setCurrentScreen('home');
          }
        }}
      />

      {/* Interactive AI Agent Chat Modal */}
      <AIChatModal
        visible={isChatModalVisible}
        onClose={() => setIsChatModalVisible(false)}
        showToast={showToast}
      />

      {/* Fullscreen Initial Launch Splash Screen - Placed last so it is 100% on top of all screens with solid backdrop */}
      {isFirstLaunchLoading && (
        <LaunchLoadingScreen
          duration={2300}
          onFinish={() => setIsFirstLaunchLoading(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <LocationProvider>
            <MainApp />
          </LocationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    borderRadius: 220,
  },
  glowBlue: {
    width: 320,
    height: 320,
    top: -100,
    left: -100,
  },
  glowRed: {
    width: 290,
    height: 290,
    top: '38%',
    right: -100,
  },
  glowNavy: {
    width: 330,
    height: 330,
    bottom: -110,
    left: '15%',
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: 420,
    width: '100%',
  },
  toastMessage: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
