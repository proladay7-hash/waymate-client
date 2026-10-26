import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import { TripData, DestinationCoord } from '../data/mockTrips';
import { openGoogleMapsNavigation, openGoogleMapsLinkOrCoords } from '../utils/mapUtils';

interface HomeScreenProps {
  trips?: TripData[];
  onAddTrip?: (trip: TripData) => void;
  onSelectTrip: (tripId: string) => void;
  savedTripIds: string[];
  onToggleSaveTrip: (tripId: string) => void;
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

export default function HomeScreen({
  trips,
  onAddTrip,
  onSelectTrip,
  savedTripIds,
  onToggleSaveTrip,
  showToast,
}: HomeScreenProps) {
  const { language, t, formatDistance, formatSpeed } = useLanguage();
  const { colors, isDark } = useTheme();
  const {
    permissionStatus,
    userLocation,
    requestLocationPermission,
    isLoadingLocation,
  } = useUserLocation();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'nearby' | 'international'>('all');
  const [likes, setLikes] = useState<Record<string, number>>({
    'trip-1': 142,
    'trip-2': 289,
    'trip-3': 312,
  });
  const [likedTrips, setLikedTrips] = useState<Record<string, boolean>>({});
  const [dismissedLocBanner, setDismissedLocBanner] = useState(false);

  // Post Trip Modal State with Google Maps Destination Coordinates & Direct Link
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

  const handleSelectQuickPin = (pin: typeof QUICK_PINS[0]) => {
    setDestName(language === 'VIE' ? pin.nameVie : pin.name);
    setDestLat(pin.lat.toString());
    setDestLng(pin.lng.toString());
    setDestAddress(pin.address);
    setDestMapUrl(pin.mapUrl || '');
    setDistanceKm(pin.distance.toString());
    setDurationStr(pin.duration);
    if (!postTitle.trim()) {
      setPostTitle(language === 'VIE' ? `Hành trình phượt ${pin.nameVie}` : `Trip to ${pin.name}`);
    }
  };

  const handlePublishTrip = () => {
    const trimmedTitle = postTitle.trim();
    const trimmedDest = destName.trim();
    const trimmedMapUrl = destMapUrl.trim();
    if (!trimmedTitle) {
      showToast('Please enter a trip title', 'info');
      return;
    }
    if (!trimmedDest && !trimmedMapUrl) {
      showToast('Please enter destination name or map link', 'info');
      return;
    }

    const parsedLat = parseFloat(destLat);
    const parsedLng = parseFloat(destLng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      showToast('Latitude must be between -90 and 90', 'info');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      showToast('Longitude must be between -180 and 180', 'info');
      return;
    }

    const dist = parseFloat(distanceKm) || 150;
    const finalDestName = trimmedDest || 'Pinned Location';
    const newTrip: TripData = {
      id: `trip-${Date.now()}`,
      title: trimmedTitle,
      titleVie: trimmedTitle,
      riderName: 'You (Rider)',
      riderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      riderBadge: 'Trail Blazer',
      riderBadgeVie: 'Dẫn đầu đoàn',
      bikeModel: 'WayMate Explorer',
      distanceKm: dist,
      avgVelocityKmh: 60,
      maxVelocityKmh: 95,
      groupSize: '1 / 6 Riders',
      duration: durationStr.trim() || '2 Days, 1 Night',
      durationVie: durationStr.trim() || '2 Ngày, 1 Đêm',
      dates: 'Today',
      category: postCategory,
      coverImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
      likesCount: 1,
      commentsCount: 0,
      totalCostVnd: '2,000,000 VND',
      totalCostUsd: '$80 USD',
      description: `Adventure ride to ${finalDestName} with pinned Google Maps navigation.`,
      descriptionVie: `Hành trình khám phá ${finalDestName} với liên kết Google Maps sẵn sàng điều hướng.`,
      googleMapsUrl: trimmedMapUrl || undefined,
      destination: {
        name: finalDestName,
        nameVie: finalDestName,
        latitude: parsedLat,
        longitude: parsedLng,
        address: destAddress.trim() || `${finalDestName} (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`,
        mapUrl: trimmedMapUrl || undefined,
      },
      eatDrink: [
        { name: 'Rider Coffee & Fuel Stop', type: 'Pit Stop', rating: '4.8 ⭐', cost: '40,000 VND' },
      ],
      landmarks: [
        { name: finalDestName, stopTime: '2 hrs', fee: 'Free' },
      ],
      lodging: [],
    };

    if (onAddTrip) {
      onAddTrip(newTrip);
    }
    setIsPostModalVisible(false);
    setPostTitle('');
    setDestMapUrl('');
  };

  const handleLike = (tripId: string) => {
    const isLiked = likedTrips[tripId];
    setLikedTrips((prev) => ({ ...prev, [tripId]: !isLiked }));
    setLikes((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] ?? 0) + (isLiked ? -1 : 1),
    }));
    showToast(t('likeTrip'), 'success');
  };

  const handleGrantPermission = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      showToast('GPS Location enabled successfully!', 'success');
    }
  };

  const allTrips = trips || [];
  const filteredTrips =
    selectedCategory === 'all'
      ? allTrips
      : allTrips.filter((item) => item.category === selectedCategory);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrapper}>
            <Text style={[styles.headerTag, { color: colors.mBlue }]}>{t('exploreJourneys')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {t('communityFeed')}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => showToast(t('searchRiders'), 'info')}
              activeOpacity={0.7}
            >
              <AntDesign name="search" size={15} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.mRed, shadowColor: colors.mRed }]}
              onPress={() => setIsPostModalVisible(true)}
              activeOpacity={0.8}
            >
              <AntDesign name="plus" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

      {/* GPS Location Permission Request Card (Prompt for phone) */}
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
              <TouchableOpacity
                onPress={() => setDismissedLocBanner(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
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
              <AntDesign
                name={isLoadingLocation ? 'loading' : 'check-circle'}
                size={12}
                color="#FFFFFF"
              />
              <Text style={styles.grantLocBtnText}>
                {isLoadingLocation ? 'Activating GPS...' : t('grantLocationBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* GPS Active Telemetry Pill (when permission is granted) */}
      {permissionStatus === 'granted' && (
        <View style={[styles.locationActivePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.locationActiveDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.locationActiveText, { color: colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
            {t('currentLocationText')}:{' '}
            <Text style={[styles.locationActiveCity, { color: colors.mBlue }]}>
              {userLocation?.city || 'TP. Hồ Chí Minh'}
            </Text>{' '}
            • {t('locationActive')}
          </Text>
        </View>
      )}

      {/* Ride Categories Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedCategory === 'all' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedCategory === 'all' ? '#FFFFFF' : colors.textMuted },
              selectedCategory === 'all' && { fontWeight: '800' },
            ]}
          >
            {t('allRides')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedCategory === 'popular' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
          ]}
          onPress={() => setSelectedCategory('popular')}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedCategory === 'popular' ? '#FFFFFF' : colors.textMuted },
              selectedCategory === 'popular' && { fontWeight: '800' },
            ]}
          >
            {t('trending')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedCategory === 'nearby' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
          ]}
          onPress={() => setSelectedCategory('nearby')}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedCategory === 'nearby' ? '#FFFFFF' : colors.textMuted },
              selectedCategory === 'nearby' && { fontWeight: '800' },
            ]}
          >
            {t('nearbyVietnam')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selectedCategory === 'international' && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
          ]}
          onPress={() => setSelectedCategory('international')}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedCategory === 'international' ? '#FFFFFF' : colors.textMuted },
              selectedCategory === 'international' && { fontWeight: '800' },
            ]}
          >
            {t('globalTours')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Feed Posts List */}
      <View style={styles.postsList}>
        {filteredTrips.map((trip: TripData) => {
          const isSaved = savedTripIds.includes(trip.id);
          const isLiked = likedTrips[trip.id];
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
                      <View style={[styles.badgePill, { backgroundColor: colors.mBlueMuted }]}>
                        <Text style={[styles.badgePillText, { color: colors.mBlue }]}>{displayBadge}</Text>
                      </View>
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
                    size={17}
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

              {/* Destination & Google Maps Navigation / Custom Link Button on Post */}
              {(trip.destination || trip.googleMapsUrl) && (
                <View style={[styles.cardDestBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardDestBarLeft}>
                    <FontAwesome6 name="location-dot" size={11} color={colors.mBlue} />
                    <View style={styles.cardDestTextWrap}>
                      <Text style={[styles.cardDestName, { color: colors.text }]} numberOfLines={1}>
                        {language === 'VIE' && trip.destination?.nameVie ? trip.destination.nameVie : (trip.destination?.name || trip.title)}
                      </Text>
                      {trip.destination ? (
                        <Text style={[styles.cardDestCoords, { color: colors.textMuted }]} numberOfLines={1}>
                          {trip.destination.latitude.toFixed(4)}°, {trip.destination.longitude.toFixed(4)}°
                          {trip.googleMapsUrl ? ' • 🔗 Link' : ''}
                        </Text>
                      ) : (
                        <Text style={[styles.cardDestCoords, { color: colors.mBlue }]} numberOfLines={1}>
                          🔗 {trip.googleMapsUrl}
                        </Text>
                      )}
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

              {/* Social Bar with Dynamic Responsive Spacing */}
              <View style={[styles.socialBar, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => handleLike(trip.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign
                    name="like"
                    size={13}
                    color={isLiked ? colors.mRed : colors.textMuted}
                  />
                  <Text style={[styles.socialText, { color: isLiked ? colors.mRed : colors.textMuted }]}>
                    {likes[trip.id] ?? trip.likesCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => onSelectTrip(trip.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="message" size={13} color={colors.textMuted} />
                  <Text style={[styles.socialText, { color: colors.textMuted }]} numberOfLines={1}>
                    {trip.commentsCount} {t('comments')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => showToast(t('copiedLink'), 'info')}
                  activeOpacity={0.7}
                >
                  <AntDesign name="share-alt" size={13} color={colors.textMuted} />
                  <Text style={[styles.socialText, { color: colors.textMuted }]}>{t('share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>

    {/* Post Trip Modal with Coordinates Pinning */}
    <Modal
      visible={isPostModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsPostModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.mBlueMuted }]}>
                <FontAwesome6 name="route" size={14} color={colors.mBlue} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('planNewTrip')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPostModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surface }]}
            >
              <AntDesign name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* Trip Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('tripTitleInput')}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder={language === 'VIE' ? 'VD: Phượt Sài Gòn - Đà Lạt cuối tuần' : 'e.g. Weekend Ride to Da Lat'}
                placeholderTextColor={colors.textMuted}
                value={postTitle}
                onChangeText={setPostTitle}
              />
            </View>

            {/* Quick Pin Presets (Da Lat, Ha Giang, Da Nang, Vung Tau) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('quickPins')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPinsRow}>
                {QUICK_PINS.map((pin, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.quickPinChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      destLat === pin.lat.toString() && { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue },
                    ]}
                    onPress={() => handleSelectQuickPin(pin)}
                  >
                    <FontAwesome6
                      name="location-dot"
                      size={10}
                      color={destLat === pin.lat.toString() ? colors.mBlue : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.quickPinChipText,
                        { color: destLat === pin.lat.toString() ? colors.mBlue : colors.textSecondary },
                      ]}
                    >
                      {language === 'VIE' ? pin.nameVie : pin.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Destination City / Landmark */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('destinationCity')}</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Đà Lạt city, Vietnam"
                placeholderTextColor={colors.textMuted}
                value={destName}
                onChangeText={setDestName}
              />
            </View>

            {/* GPS Coordinates: Latitude & Longitude */}
            <View style={styles.coordsRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('latitude')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="11.9404"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={destLat}
                  onChangeText={setDestLat}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('longitude')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="108.4583"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={destLng}
                  onChangeText={setDestLng}
                />
              </View>
            </View>

            {/* Distance & Duration */}
            <View style={styles.coordsRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('tripDistanceInput')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="310"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('tripDurationInput')}</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="2 Days, 1 Night"
                  placeholderTextColor={colors.textMuted}
                  value={durationStr}
                  onChangeText={setDurationStr}
                />
              </View>
            </View>

            {/* Google Maps Direct Link / Share URL (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('googleMapsUrl')}</Text>
                <Text style={[styles.inputOptionalBadge, { color: colors.mBlue }]}>URL / Share Link</Text>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder={t('googleMapsUrlPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
                value={destMapUrl}
                onChangeText={setDestMapUrl}
              />
            </View>

            {/* Google Maps Integration Notice */}
            <View style={[styles.modalMapsNotice, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <FontAwesome6 name="route" size={13} color="#1A73E8" />
              <Text style={[styles.modalMapsNoticeText, { color: colors.textSecondary }]}>
                {language === 'VIE'
                  ? 'Chuyến đi sẽ tự động kích hoạt nút xem trước lộ trình Google Maps cho các biker khác.'
                  : 'This trip will automatically feature a Google Maps route preview button for fellow riders.'}
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.publishTripBtn}
            activeOpacity={0.85}
            onPress={handlePublishTrip}
          >
            <LinearGradient
              colors={colors.mGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.publishTripGradient}
            >
              <FontAwesome6 name="paper-plane" size={13} color="#FFFFFF" />
              <Text style={styles.publishTripBtnText}>{t('postTripBtn')}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleWrapper: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTag: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF5E1A',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FF5E1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  locationBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.35)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  locationBannerIconCol: {
    justifyContent: 'flex-start',
  },
  locationIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 94, 26, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.3)',
  },
  locationBannerBody: {
    flex: 1,
    minWidth: 0,
  },
  locationBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  locationBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locationBannerDesc: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
    marginBottom: 8,
  },
  grantLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#FF5E1A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  grantLocBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  locationActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 6,
  },
  locationActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  locationActiveText: {
    flex: 1,
    fontSize: 10,
    color: '#94A3B8',
  },
  locationActiveCity: {
    color: '#10B981',
    fontWeight: '700',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 4,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: '#FF5E1A',
    borderColor: '#FF5E1A',
  },
  filterPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  postsList: {
    gap: 14,
  },
  card: {
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
    marginRight: 8,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.4)',
  },
  authorTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 94, 26, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    flexShrink: 0,
  },
  badgePillText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FF5E1A',
  },
  bikeModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  bikeModelText: {
    fontSize: 9.5,
    color: '#94A3B8',
    flexShrink: 1,
  },
  favoriteBtn: {
    flexShrink: 0,
    padding: 4,
  },
  coverImageContainer: {
    width: '100%',
    height: 145,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
  },
  coverContentBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverTitleWrapper: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  coverTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverSubtitle: {
    fontSize: 9,
    color: '#CBD5E1',
    marginTop: 2,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF5E1A',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    flexShrink: 0,
  },
  distanceBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 7,
    marginVertical: 9,
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#1E293B',
  },
  telemetryLabel: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  socialBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.6)',
  },
  socialAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  socialText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardDestBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  cardDestBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  cardDestTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardDestName: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDestCoords: {
    fontSize: 9,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    flexShrink: 0,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  openMapsBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputOptionalBadge: {
    fontSize: 9,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    fontWeight: '600',
  },
  quickPinsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  quickPinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPinChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalMapsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 10,
  },
  modalMapsNoticeText: {
    fontSize: 10.5,
    lineHeight: 15,
    flex: 1,
  },
  publishTripBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  publishTripGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  publishTripBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
