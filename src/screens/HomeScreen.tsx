import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { mockTripsData, TripData } from '../data/mockTrips';

interface HomeScreenProps {
  onSelectTrip: (tripId: string) => void;
  savedTripIds: string[];
  onToggleSaveTrip: (tripId: string) => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function HomeScreen({
  onSelectTrip,
  savedTripIds,
  onToggleSaveTrip,
  showToast,
}: HomeScreenProps) {
  const { language, t, formatDistance, formatSpeed } = useLanguage();
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
  });
  const [likedTrips, setLikedTrips] = useState<Record<string, boolean>>({});
  const [dismissedLocBanner, setDismissedLocBanner] = useState(false);

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

  const filteredTrips =
    selectedCategory === 'all'
      ? mockTripsData
      : mockTripsData.filter((item) => item.category === selectedCategory);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTag}>{t('exploreJourneys')}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('communityFeed')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => showToast(t('searchRiders'), 'info')}
            activeOpacity={0.7}
          >
            <AntDesign name="search" size={15} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => showToast(t('newTripOpened'), 'info')}
            activeOpacity={0.8}
          >
            <AntDesign name="plus" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* GPS Location Permission Request Card (Prompt for phone) */}
      {permissionStatus !== 'granted' && !dismissedLocBanner && (
        <View style={styles.locationBanner}>
          <View style={styles.locationBannerIconCol}>
            <View style={styles.locationIconCircle}>
              <AntDesign name="environment" size={18} color="#FF5E1A" />
            </View>
          </View>
          <View style={styles.locationBannerBody}>
            <View style={styles.locationBannerTopRow}>
              <Text style={styles.locationBannerTitle}>
                {t('locationPermissionTitle')}
              </Text>
              <TouchableOpacity
                onPress={() => setDismissedLocBanner(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="close" size={12} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.locationBannerDesc}>
              {t('locationPermissionDesc')}
            </Text>
            <TouchableOpacity
              style={styles.grantLocBtn}
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
        <View style={styles.locationActivePill}>
          <View style={styles.locationActiveDot} />
          <Text style={styles.locationActiveText} numberOfLines={1} ellipsizeMode="tail">
            {t('currentLocationText')}:{' '}
            <Text style={styles.locationActiveCity}>
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
            selectedCategory === 'all' && styles.filterPillActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedCategory === 'all' && styles.filterPillTextActive,
            ]}
          >
            {t('allRides')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedCategory === 'popular' && styles.filterPillActive,
          ]}
          onPress={() => setSelectedCategory('popular')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedCategory === 'popular' && styles.filterPillTextActive,
            ]}
          >
            {t('trending')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedCategory === 'nearby' && styles.filterPillActive,
          ]}
          onPress={() => setSelectedCategory('nearby')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedCategory === 'nearby' && styles.filterPillTextActive,
            ]}
          >
            {t('nearbyVietnam')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            selectedCategory === 'international' && styles.filterPillActive,
          ]}
          onPress={() => setSelectedCategory('international')}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedCategory === 'international' && styles.filterPillTextActive,
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
            <View key={trip.id} style={styles.card}>
              {/* Author Header */}
              <View style={styles.authorRow}>
                <View style={styles.authorInfo}>
                  <Image source={{ uri: trip.riderAvatar }} style={styles.authorAvatar} />
                  <View style={styles.authorTextWrapper}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName} numberOfLines={1}>
                        {trip.riderName}
                      </Text>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{displayBadge}</Text>
                      </View>
                    </View>
                    <View style={styles.bikeModelRow}>
                      <FontAwesome6 name="motorcycle" size={10} color="#FF9F1C" />
                      <Text style={styles.bikeModelText} numberOfLines={1}>
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
                    color={isSaved ? '#EF4444' : '#64748B'}
                  />
                </TouchableOpacity>
              </View>

              {/* Cover Image & Telemetry Overlay */}
              <TouchableOpacity
                style={styles.coverImageContainer}
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
                  <View style={styles.distanceBadge}>
                    <AntDesign name="dashboard" size={11} color="#FFFFFF" />
                    <Text style={styles.distanceBadgeText}>
                      {formatDistance(trip.distanceKm)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* 3 Telemetry Metrics */}
              <View style={styles.telemetryBar}>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>{t('avgSpeed')}</Text>
                  <Text style={[styles.telemetryValue, { color: '#00F2FE' }]}>
                    {formatSpeed(trip.avgVelocityKmh)}
                  </Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>{t('groupSize')}</Text>
                  <Text style={[styles.telemetryValue, { color: '#FF9F1C' }]}>
                    {trip.groupSize}
                  </Text>
                </View>
                <View style={styles.telemetryDivider} />
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>{t('estTotal')}</Text>
                  <Text style={[styles.telemetryValue, { color: '#34D399' }]}>
                    {language === 'VIE' ? trip.totalCostVnd : trip.totalCostUsd}
                  </Text>
                </View>
              </View>

              {/* Social Bar with Dynamic Responsive Spacing */}
              <View style={styles.socialBar}>
                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => handleLike(trip.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign
                    name="like"
                    size={13}
                    color={isLiked ? '#FF5E1A' : '#94A3B8'}
                  />
                  <Text style={[styles.socialText, isLiked && { color: '#FF5E1A' }]}>
                    {likes[trip.id] ?? trip.likesCount}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => onSelectTrip(trip.id)}
                  activeOpacity={0.7}
                >
                  <AntDesign name="message" size={13} color="#94A3B8" />
                  <Text style={styles.socialText} numberOfLines={1}>
                    {trip.commentsCount} {t('comments')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialAction}
                  onPress={() => showToast(t('copiedLink'), 'info')}
                  activeOpacity={0.7}
                >
                  <AntDesign name="share-alt" size={13} color="#94A3B8" />
                  <Text style={styles.socialText}>{t('share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
});
