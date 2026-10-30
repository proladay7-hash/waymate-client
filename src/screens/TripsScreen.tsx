import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { TripData } from '../data/mockTrips';
import { UserDto } from '../services/authApi';
import { openGoogleMapsLinkOrCoords } from '../utils/mapUtils';

export type TripTab = 'all' | 'personal' | 'saved';

interface TripsScreenProps {
  trips?: TripData[];
  currentUser: UserDto | null;
  onAddTrip?: (trip: TripData) => void;
  onSelectTrip: (tripId: string) => void;
  onAttachToPost?: (tripId: string) => void;
  savedTripIds: string[];
  onToggleSaveTrip: (tripId: string) => void;
  joinRequests?: Record<string, 'pending' | 'accepted'>;
  onRequestJoinTrip?: (tripId: string, tripTitle: string, organizerName: string) => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

const QUICK_PINS = [
  {
    name: 'Da Lat City, Lam Dong',
    nameVie: 'TP. Đà Lạt, Lâm Đồng',
    lat: 11.9404,
    lng: 108.4583,
    address: 'Đà Lạt, Lâm Đồng, Vietnam',
    mapUrl: 'https://maps.app.goo.gl/DaLatCityVietnam',
    distance: 310,
    duration: '2 Days, 1 Night',
  },
  {
    name: 'Ma Pi Leng Pass, Ha Giang',
    nameVie: 'Đèo Mã Pí Lèng, Hà Giang',
    lat: 23.2386,
    lng: 105.4194,
    address: 'Pải Lủng, Mèo Vạc, Hà Giang, Vietnam',
    mapUrl: 'https://maps.app.goo.gl/MaPiLengPass',
    distance: 420,
    duration: '3 Days, 2 Nights',
  },
  {
    name: 'Da Nang Coastal City',
    nameVie: 'TP. Đà Nẵng',
    lat: 16.0544,
    lng: 108.2022,
    address: 'Đà Nẵng, Vietnam',
    mapUrl: 'https://maps.app.goo.gl/DaNangBeach',
    distance: 850,
    duration: '4 Days, 3 Nights',
  },
  {
    name: 'Vung Tau Beach',
    nameVie: 'Bãi Sau, Vũng Tàu',
    lat: 10.3460,
    lng: 107.0843,
    address: 'Vũng Tàu, Bà Rịa - Vũng Tàu, Vietnam',
    mapUrl: 'https://maps.app.goo.gl/VungTauCoastal',
    distance: 95,
    duration: '1 Day',
  },
];

export default function TripsScreen({
  trips = [],
  currentUser,
  onAddTrip,
  onSelectTrip,
  onAttachToPost,
  savedTripIds = [],
  onToggleSaveTrip,
  joinRequests = {},
  onRequestJoinTrip,
  showToast,
}: TripsScreenProps) {
  const { language, t, formatDistance, formatSpeed } = useLanguage();
  const { colors, isDark } = useTheme();
  const {
    permissionStatus,
    userLocation,
    requestLocationPermission,
    isLoadingLocation,
  } = useUserLocation();

  // Top Tabs: All Explore / Personal Trips / Saved Trips
  const [activeTab, setActiveTab] = useState<TripTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'nearby' | 'international'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dismissedLocBanner, setDismissedLocBanner] = useState(false);

  // Plan New Personal Trip Modal State
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [destName, setDestName] = useState('Đà Lạt City, Vietnam');
  const [destLat, setDestLat] = useState('11.9404');
  const [destLng, setDestLng] = useState('108.4583');
  const [destAddress, setDestAddress] = useState('Đà Lạt, Lâm Đồng, Vietnam');
  const [destMapUrl, setDestMapUrl] = useState('https://maps.app.goo.gl/DaLatCityVietnam');
  const [distanceKm, setDistanceKm] = useState('310');
  const [durationStr, setDurationStr] = useState('2 Days, 1 Night');
  const [postCategory, setPostCategory] = useState<'all' | 'popular' | 'nearby' | 'international'>('nearby');

  const myName = currentUser?.name || 'You';
  const myId = currentUser?.id;

  const isPersonalTrip = (trip: TripData): boolean => {
    if ((trip as any).isPersonal) return true;
    if (myId && (trip as any).authorId === myId) return true;
    if (trip.riderName && (trip.riderName === myName || trip.riderName.startsWith('You'))) return true;
    return false;
  };

  // Filtered trips for each tab
  const personalTrips = useMemo(() => {
    return trips.filter(isPersonalTrip);
  }, [trips, myName, myId]);

  const savedTrips = useMemo(() => {
    return trips.filter((t) => savedTripIds.includes(t.id));
  }, [trips, savedTripIds]);

  const displayedTrips = useMemo(() => {
    let list: TripData[] = [];
    if (activeTab === 'personal') {
      list = personalTrips;
    } else if (activeTab === 'saved') {
      list = savedTrips;
    } else {
      list =
        selectedCategory === 'all'
          ? trips
          : trips.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.titleVie?.toLowerCase().includes(q) ||
          item.riderName.toLowerCase().includes(q) ||
          item.destination?.name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [trips, activeTab, personalTrips, savedTrips, selectedCategory, searchQuery]);

  const handleSelectQuickPin = (pin: typeof QUICK_PINS[0]) => {
    setDestName(language === 'VIE' ? pin.nameVie : pin.name);
    setDestLat(pin.lat.toString());
    setDestLng(pin.lng.toString());
    setDestAddress(pin.address);
    setDestMapUrl(pin.mapUrl || '');
    setDistanceKm(pin.distance.toString());
    setDurationStr(pin.duration);
    if (!postTitle.trim()) {
      setPostTitle(language === 'VIE' ? `Hành trình ${pin.nameVie}` : `Trip to ${pin.name}`);
    }
  };

  const handlePublishTrip = () => {
    const trimmedTitle = postTitle.trim();
    const trimmedDest = destName.trim();
    const trimmedMapUrl = destMapUrl.trim();
    if (!trimmedTitle) {
      showToast(language === 'VIE' ? 'Vui lòng nhập tiêu đề chuyến đi' : 'Please enter a trip title', 'info');
      return;
    }
    if (!trimmedDest && !trimmedMapUrl) {
      showToast(language === 'VIE' ? 'Vui lòng nhập điểm đến' : 'Please enter destination name or map link', 'info');
      return;
    }

    const parsedLat = parseFloat(destLat) || 11.9404;
    const parsedLng = parseFloat(destLng) || 108.4583;
    const dist = parseFloat(distanceKm) || 150;
    const finalDestName = trimmedDest || 'Pinned Location';

    const newTrip: TripData = {
      id: `trip-${Date.now()}`,
      title: trimmedTitle,
      titleVie: trimmedTitle,
      riderName: currentUser?.name || 'You (Rider)',
      riderAvatar:
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      riderBadge: 'Trail Blazer',
      riderBadgeVie: 'Dẫn đầu đoàn',
      bikeModel: 'Adventure Motorcycle',
      distanceKm: dist,
      avgVelocityKmh: 60,
      maxVelocityKmh: 95,
      groupSize: '1 / 6 Riders',
      duration: durationStr.trim() || '2 Days, 1 Night',
      durationVie: durationStr.trim() || '2 Ngày, 1 Đêm',
      dates: 'Upcoming',
      category: postCategory,
      coverImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
      likesCount: 1,
      commentsCount: 0,
      totalCostVnd: '2,000,000 VND',
      totalCostUsd: '$80 USD',
      description: `Adventure ride to ${finalDestName} planned with WayMate.`,
      descriptionVie: `Hành trình khám phá ${finalDestName} cùng cộng đồng phượt WayMate.`,
      googleMapsUrl: trimmedMapUrl || undefined,
      destination: {
        name: finalDestName,
        nameVie: finalDestName,
        latitude: parsedLat,
        longitude: parsedLng,
        address: destAddress.trim() || `${finalDestName}`,
        mapUrl: trimmedMapUrl || undefined,
      },
      eatDrink: [
        { name: 'Rider Pit Stop & Coffee', type: 'Pit Stop', rating: '4.8 ⭐', cost: '40,000 VND' },
      ],
      landmarks: [{ name: finalDestName, stopTime: '2 hrs', fee: 'Free' }],
      lodging: [],
      ...({
        authorId: currentUser?.id,
        isPersonal: true,
      } as any),
    };

    if (onAddTrip) {
      onAddTrip(newTrip);
    }
    setIsPostModalVisible(false);
    setPostTitle('');
    setDestMapUrl('');
    setActiveTab('personal');
    showToast(language === 'VIE' ? 'Đã tạo chuyến đi cá nhân thành công! 🏍️' : 'Personal trip created! 🏍️', 'success');
  };

  const handleGrantPermission = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      showToast('GPS Location enabled successfully!', 'success');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrapper}>
            <Text style={[styles.headerTag, { color: colors.mBlue }]}>
              {language === 'VIE' ? 'Hành trình & Cung đường' : 'Adventure Routes'}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {t('navTrips')}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: showSearch ? colors.mBlueMuted : colors.surfaceElevated,
                  borderColor: showSearch ? colors.mBlue : colors.border,
                },
              ]}
              onPress={() => setShowSearch(!showSearch)}
              activeOpacity={0.7}
            >
              <AntDesign name="search" size={15} color={showSearch ? colors.mBlue : colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.mBlue, shadowColor: colors.mBlue }]}
              onPress={() => setIsPostModalVisible(true)}
              activeOpacity={0.8}
            >
              <AntDesign name="plus" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Collapsible Search Input */}
        {showSearch && (
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AntDesign name="search" size={14} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={language === 'VIE' ? 'Tìm chuyến đi, điểm đến, rider...' : 'Search trips, destinations, riders...'}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AntDesign name="close" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Segmented Top Tabs: [ Explore Trips ] [ Personal Trips ] [ Saved Trips ] */}
        <View style={[styles.tabsWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'all' && [styles.tabButtonActive, { backgroundColor: colors.card, borderColor: colors.mBlue }],
            ]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name="compass"
              size={12}
              color={activeTab === 'all' ? colors.mBlue : colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'all' ? colors.text : colors.textMuted },
                activeTab === 'all' && styles.tabButtonTextActive,
              ]}
            >
              {t('exploreTrips')}
            </Text>
            <View style={[styles.tabCountBadge, { backgroundColor: activeTab === 'all' ? colors.mBlue : colors.surfaceElevated }]}>
              <Text style={[styles.tabCountText, { color: activeTab === 'all' ? '#FFFFFF' : colors.textMuted }]}>
                {trips.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'personal' && [styles.tabButtonActive, { backgroundColor: colors.card, borderColor: colors.mBlue }],
            ]}
            onPress={() => setActiveTab('personal')}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name="user"
              size={12}
              color={activeTab === 'personal' ? colors.mBlue : colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'personal' ? colors.text : colors.textMuted },
                activeTab === 'personal' && styles.tabButtonTextActive,
              ]}
            >
              {t('personalTrips')}
            </Text>
            {personalTrips.length > 0 && (
              <View style={[styles.tabCountBadge, { backgroundColor: activeTab === 'personal' ? colors.mBlue : colors.surfaceElevated }]}>
                <Text style={[styles.tabCountText, { color: activeTab === 'personal' ? '#FFFFFF' : colors.textMuted }]}>
                  {personalTrips.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'saved' && [styles.tabButtonActive, { backgroundColor: colors.card, borderColor: colors.mRed }],
            ]}
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name="heart"
              size={12}
              color={activeTab === 'saved' ? colors.mRed : colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'saved' ? colors.text : colors.textMuted },
                activeTab === 'saved' && styles.tabButtonTextActive,
              ]}
            >
              {t('savedTrips')}
            </Text>
            {savedTripIds.length > 0 && (
              <View style={[styles.tabCountBadge, { backgroundColor: activeTab === 'saved' ? colors.mRed : colors.surfaceElevated }]}>
                <Text style={[styles.tabCountText, { color: activeTab === 'saved' ? '#FFFFFF' : colors.textMuted }]}>
                  {savedTripIds.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* GPS Permission Prompt (if not granted) */}
        {permissionStatus !== 'granted' && !dismissedLocBanner && (
          <View style={[styles.locationBanner, { backgroundColor: colors.card, borderColor: colors.mBlueMuted }]}>
            <View style={styles.locationBannerIconCol}>
              <View style={[styles.locationIconCircle, { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue }]}>
                <AntDesign name="environment" size={18} color={colors.mBlue} />
              </View>
            </View>
            <View style={styles.locationBannerBody}>
              <View style={styles.locationBannerTopRow}>
                <Text style={[styles.locationBannerTitle, { color: colors.text }]}>
                  {t('locationPermissionTitle')}
                </Text>
                <TouchableOpacity onPress={() => setDismissedLocBanner(true)}>
                  <AntDesign name="close" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.locationBannerDesc, { color: colors.textSecondary }]}>
                {t('locationPermissionDesc')}
              </Text>
              <TouchableOpacity
                style={[styles.grantLocBtn, { backgroundColor: colors.mBlue }]}
                onPress={handleGrantPermission}
                activeOpacity={0.8}
                disabled={isLoadingLocation}
              >
                <AntDesign name={isLoadingLocation ? 'loading' : 'check-circle'} size={12} color="#FFFFFF" />
                <Text style={styles.grantLocBtnText}>
                  {isLoadingLocation ? 'Activating GPS...' : t('grantLocationBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sub-Category Pills for Explore Tab */}
        {activeTab === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {[
              { id: 'all' as const, label: t('allRides') },
              { id: 'popular' as const, label: t('trending') },
              { id: 'nearby' as const, label: t('nearbyVietnam') },
              { id: 'international' as const, label: t('globalTours') },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? colors.mBlue : colors.surface,
                      borderColor: isSelected ? colors.mBlue : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isSelected ? '#FFFFFF' : colors.textMuted },
                      isSelected && styles.filterPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Empty States */}
        {displayedTrips.length === 0 && (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FontAwesome6
              name={activeTab === 'saved' ? 'heart' : activeTab === 'personal' ? 'route' : 'compass'}
              size={36}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'personal'
                ? t('noPersonalTrips')
                : activeTab === 'saved'
                ? t('noSavedTrips')
                : (language === 'VIE' ? 'Không tìm thấy chuyến đi nào' : 'No trips found')}
            </Text>
            {activeTab === 'personal' && (
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.mBlue }]}
                onPress={() => setIsPostModalVisible(true)}
                activeOpacity={0.8}
              >
                <AntDesign name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>{t('planNewTrip')}</Text>
              </TouchableOpacity>
            )}
            {activeTab === 'saved' && (
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setActiveTab('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.emptyActionBtnText, { color: colors.text }]}>{t('exploreTrips')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Trips Cards List */}
        <View style={styles.postsList}>
          {displayedTrips.map((trip: TripData) => {
            const isSaved = savedTripIds.includes(trip.id);
            const isMine = isPersonalTrip(trip);
            const joinStatus = joinRequests[trip.id];
            const displayTitle = language === 'VIE' ? trip.titleVie : trip.title;
            const displayBadge = language === 'VIE' ? trip.riderBadgeVie : trip.riderBadge;
            const displayDuration = language === 'VIE' ? trip.durationVie : trip.duration;

            return (
              <View key={trip.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Author Header */}
                <View style={styles.authorRow}>
                  <View style={styles.authorInfo}>
                    <Image source={{ uri: trip.riderAvatar }} style={[styles.authorAvatar, { borderColor: colors.mBlue }]} />
                    <View style={styles.authorTextWrapper}>
                      <View style={styles.authorNameRow}>
                        <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                          {trip.riderName}
                        </Text>
                        {isMine ? (
                          <View style={[styles.badgePill, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: colors.mBlue, borderWidth: 1 }]}>
                            <Text style={[styles.badgePillText, { color: colors.mBlue }]}>
                              {t('yourTripBadge')}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.badgePill, { backgroundColor: colors.mBlueMuted }]}>
                            <Text style={[styles.badgePillText, { color: colors.mBlue }]}>{displayBadge}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.bikeModelRow}>
                        <FontAwesome6 name="motorcycle" size={10} color={colors.mBlue} />
                        <Text style={[styles.bikeModelText, { color: colors.textMuted }]} numberOfLines={1}>
                          {trip.bikeModel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Favorite Heart Button */}
                  <TouchableOpacity
                    style={styles.favoriteBtn}
                    onPress={() => onToggleSaveTrip(trip.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AntDesign
                      name="heart"
                      size={18}
                      color={isSaved ? colors.mRed : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Cover Image & Telemetry Overlay */}
                <TouchableOpacity
                  style={[styles.coverImageContainer, { backgroundColor: colors.surface }]}
                  activeOpacity={0.9}
                  onPress={() => onSelectTrip(trip.id)}
                >
                  <Image source={{ uri: trip.coverImage }} style={styles.coverImage} />
                  <View style={styles.coverGradientOverlay} />

                  <View style={styles.coverContentBottom}>
                    <View style={styles.coverTitleWrapper}>
                      <Text style={styles.coverTitle} numberOfLines={1}>
                        {displayTitle}
                      </Text>
                      <Text style={styles.coverSubtitle} numberOfLines={1}>
                        {displayDuration} • {trip.dates}
                      </Text>
                    </View>
                    <View style={[styles.distanceBadge, { backgroundColor: colors.mRed }]}>
                      <AntDesign name="dashboard" size={11} color="#FFFFFF" />
                      <Text style={styles.distanceBadgeText}>
                        {formatDistance(trip.distanceKm)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 3 Telemetry Metrics */}
                <View style={[styles.telemetryBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.telemetryItem}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>{t('avgSpeed')}</Text>
                    <Text style={[styles.telemetryValue, { color: colors.mBlue }]}>
                      {formatSpeed(trip.avgVelocityKmh)}
                    </Text>
                  </View>
                  <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.telemetryItem}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>{t('groupSize')}</Text>
                    <Text style={[styles.telemetryValue, { color: colors.text }]}>
                      {trip.groupSize}
                    </Text>
                  </View>
                  <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.telemetryItem}>
                    <Text style={[styles.telemetryLabel, { color: colors.textMuted }]}>{t('estTotal')}</Text>
                    <Text style={[styles.telemetryValue, { color: colors.success }]}>
                      {language === 'VIE' ? trip.totalCostVnd : trip.totalCostUsd}
                    </Text>
                  </View>
                </View>

                {/* Destination Bar & Google Maps Preview */}
                {(trip.destination || trip.googleMapsUrl) && (
                  <View style={[styles.cardDestBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardDestBarLeft}>
                      <FontAwesome6 name="location-dot" size={11} color={colors.mBlue} />
                      <View style={styles.cardDestTextWrap}>
                        <Text style={[styles.cardDestName, { color: colors.text }]} numberOfLines={1}>
                          {language === 'VIE' && trip.destination?.nameVie ? trip.destination.nameVie : (trip.destination?.name || trip.title)}
                        </Text>
                        <Text style={[styles.cardDestCoords, { color: colors.textMuted }]} numberOfLines={1}>
                          {trip.destination ? `${trip.destination.latitude.toFixed(4)}°, ${trip.destination.longitude.toFixed(4)}°` : trip.googleMapsUrl}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.openMapsBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        showToast(t('mapsNavigationNotice'), 'info');
                        openGoogleMapsLinkOrCoords(
                          trip.googleMapsUrl || trip.destination?.mapUrl,
                          trip.destination?.latitude,
                          trip.destination?.longitude,
                          trip.destination?.name
                        );
                      }}
                    >
                      <FontAwesome6 name={trip.googleMapsUrl ? 'arrow-up-right-from-square' : 'route'} size={10} color="#FFFFFF" />
                      <Text style={styles.openMapsBtnText}>
                        {trip.googleMapsUrl ? t('openMapLink') : t('openInGoogleMaps')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Primary Action Buttons: Attach to Post & Request to Join */}
                <View style={[styles.tripActionRow, { borderTopColor: colors.border }]}>
                  {/* Attach / Share to Feed Button */}
                  <TouchableOpacity
                    style={[styles.actionBtnSecondary, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={() => {
                      if (onAttachToPost) {
                        onAttachToPost(trip.id);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6 name="paper-plane" size={12} color={colors.mBlue} />
                    <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                      {t('attachTripToPost')}
                    </Text>
                  </TouchableOpacity>

                  {/* Join Trip Request Button */}
                  {isMine ? (
                    <View style={[styles.organizerPill, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: colors.mBlue }]}>
                      <FontAwesome6 name="crown" size={11} color={colors.mBlue} />
                      <Text style={[styles.organizerPillText, { color: colors.mBlue }]}>
                        {t('yourTripBadge')}
                      </Text>
                    </View>
                  ) : joinStatus === 'pending' ? (
                    <View style={[styles.joinStatusPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' }]}>
                      <AntDesign name="check" size={12} color="#10B981" />
                      <Text style={[styles.joinStatusPillText, { color: '#10B981' }]}>
                        {t('joinRequestedBadge')}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinTripBtn, { backgroundColor: colors.mRed }]}
                      onPress={() => {
                        if (onRequestJoinTrip) {
                          onRequestJoinTrip(trip.id, displayTitle, trip.riderName);
                        } else {
                          showToast(t('joinSlotRequested'), 'success');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <FontAwesome6 name="user-plus" size={11} color="#FFFFFF" />
                      <Text style={styles.joinTripBtnText}>{t('requestToJoin')}</Text>
                    </TouchableOpacity>
                  )}

                  {/* View Details Button */}
                  <TouchableOpacity
                    style={[styles.detailsBtn, { borderColor: colors.border }]}
                    onPress={() => onSelectTrip(trip.id)}
                    activeOpacity={0.7}
                  >
                    <AntDesign name="right" size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Plan New Personal Trip Modal */}
      <Modal
        visible={isPostModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPostModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <FontAwesome6 name="route" size={16} color={colors.mBlue} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('planNewTrip')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPostModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AntDesign name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              {/* Quick Pins Presets */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('quickPins')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPinsRow}>
                  {QUICK_PINS.map((pin, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.quickPinChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleSelectQuickPin(pin)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="location-dot" size={11} color={colors.mRed} />
                      <Text style={[styles.quickPinChipText, { color: colors.text }]}>
                        {language === 'VIE' ? pin.nameVie : pin.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Title Input */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('tripTitleInput')} *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder={language === 'VIE' ? 'VD: Chinh phục đèo Ô Quy Hồ' : 'e.g. Scenic Coastal Ride'}
                  placeholderTextColor={colors.textMuted}
                  value={postTitle}
                  onChangeText={setPostTitle}
                />
              </View>

              {/* Destination Name */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('destinationCity')} *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Da Lat, Lam Dong"
                  placeholderTextColor={colors.textMuted}
                  value={destName}
                  onChangeText={setDestName}
                />
              </View>

              {/* Coordinates Row */}
              <View style={styles.coordsRow}>
                <View style={[styles.fieldWrapper, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('latitude')}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="11.9404"
                    placeholderTextColor={colors.textMuted}
                    value={destLat}
                    onChangeText={setDestLat}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldWrapper, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('longitude')}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="108.4583"
                    placeholderTextColor={colors.textMuted}
                    value={destLng}
                    onChangeText={setDestLng}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Google Maps URL */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('googleMapsUrl')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="https://maps.app.goo.gl/..."
                  placeholderTextColor={colors.textMuted}
                  value={destMapUrl}
                  onChangeText={setDestMapUrl}
                  autoCapitalize="none"
                />
              </View>

              {/* Distance & Duration */}
              <View style={styles.coordsRow}>
                <View style={[styles.fieldWrapper, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('tripDistanceInput')}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="310"
                    placeholderTextColor={colors.textMuted}
                    value={distanceKm}
                    onChangeText={setDistanceKm}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldWrapper, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('tripDurationInput')}</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="2 Days, 1 Night"
                    placeholderTextColor={colors.textMuted}
                    value={durationStr}
                    onChangeText={setDurationStr}
                  />
                </View>
              </View>

              {/* Category Picker */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.catPickerRow}>
                  {[
                    { id: 'popular' as const, label: 'Trending' },
                    { id: 'nearby' as const, label: 'Nearby' },
                    { id: 'international' as const, label: 'Global' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: postCategory === c.id ? colors.mBlue : colors.card,
                          borderColor: postCategory === c.id ? colors.mBlue : colors.border,
                        },
                      ]}
                      onPress={() => setPostCategory(c.id)}
                    >
                      <Text style={[styles.catOptionText, { color: postCategory === c.id ? '#FFFFFF' : colors.text }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitTripBtn, { backgroundColor: colors.mBlue }]}
                onPress={handlePublishTrip}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="check" size={14} color="#FFFFFF" />
                <Text style={styles.submitTripBtnText}>{t('postTripBtn')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerTitleWrapper: {
    gap: 2,
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    fontWeight: '800',
  },
  tabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabCountText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  filtersContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  filterPillTextActive: {
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  locationBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  locationBannerIconCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  locationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  locationBannerBody: {
    flex: 1,
    gap: 4,
  },
  locationBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  locationBannerDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  grantLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  grantLocBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  postsList: {
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
  authorTextWrapper: {
    flex: 1,
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  bikeModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bikeModelText: {
    fontSize: 11,
  },
  favoriteBtn: {
    padding: 6,
  },
  coverImageContainer: {
    height: 175,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  coverGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  coverContentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 12,
  },
  coverTitleWrapper: {
    flex: 1,
    marginRight: 10,
    gap: 2,
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverSubtitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 22,
  },
  telemetryLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardDestBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  cardDestBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardDestTextWrap: {
    flex: 1,
  },
  cardDestName: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardDestCoords: {
    fontSize: 10,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  openMapsBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  tripActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  joinTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  joinTripBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  joinStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  joinStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  organizerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  organizerPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  fieldWrapper: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  quickPinsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  quickPinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickPinChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  catPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  submitTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  submitTripBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
