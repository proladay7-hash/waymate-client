import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TripData } from '../data/mockTrips';
import { openGoogleMapsNavigation, openGoogleMapsLinkOrCoords } from '../utils/mapUtils';

interface TripDetailScreenProps {
  tripId: string;
  trips?: TripData[];
  onBack: () => void;
  savedTripIds: string[];
  onToggleSaveTrip: (tripId: string) => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function TripDetailScreen({
  tripId,
  trips = [],
  onBack,
  savedTripIds,
  onToggleSaveTrip,
  showToast,
}: TripDetailScreenProps) {
  const { language, t, formatDistance, formatSpeed } = useLanguage();
  const { colors, isDark } = useTheme();

  const allTrips = trips;
  const trip: TripData | undefined = allTrips.find((t) => t.id === tripId) ?? allTrips[0];
  const isSaved = trip ? savedTripIds.includes(trip.id) : false;

  const displayTitle = trip ? (language === 'VIE' ? trip.titleVie : trip.title) : 'Trip Details';
  const displayDescription = trip ? (language === 'VIE' ? trip.descriptionVie : trip.description) : '';

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Trip Not Found</Text>
        <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.mBlue, borderRadius: 10 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Detail Header Controls */}
      <View style={styles.headerControls}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <AntDesign name="arrow-left" size={16} color={colors.text} />
          <Text style={[styles.backBtnText, { color: colors.text }]} numberOfLines={1}>{t('backToFeed')}</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => onToggleSaveTrip(trip.id)}
            activeOpacity={0.8}
          >
            <AntDesign
              name="heart"
              size={14}
              color={isSaved ? colors.mRed : colors.textMuted}
            />
            <Text style={[styles.saveBtnText, { color: isSaved ? colors.mRed : colors.textSecondary }, isSaved && styles.saveBtnTextSaved]} numberOfLines={1}>
              {isSaved ? t('savedInFavorites') : t('saveTrip')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => showToast(t('gpxExported'), 'success')}
            activeOpacity={0.8}
          >
            <AntDesign name="export" size={14} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title & Author Info */}
      <View style={styles.titleSection}>
        <Text style={[styles.tripTitle, { color: colors.text }]}>{displayTitle}</Text>
        <View style={styles.authorSubtitleRow}>
          <Text style={[styles.authorSubtitleText, { color: colors.textMuted }]}>
            {t('by')} <Text style={[styles.authorNameText, { color: colors.mBlue }]}>{trip.riderName}</Text>
          </Text>
          <Text style={[styles.bulletSeparator, { color: colors.textMuted }]}>•</Text>
          <Text style={[styles.bikeModelText, { color: colors.textMuted }]}>{trip.bikeModel}</Text>
        </View>
        <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{displayDescription}</Text>
      </View>

      {/* 4 Telemetry Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('distance')}</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDistance(trip.distanceKm)}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('avgSpeed')}</Text>
          <Text style={[styles.statValue, { color: colors.mBlue }]}>
            {formatSpeed(trip.avgVelocityKmh)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('maxSpeed')}</Text>
          <Text style={[styles.statValue, { color: colors.mRed }]}>
            {formatSpeed(trip.maxVelocityKmh)}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('group')}</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {trip.groupSize.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* Dynamic Route Map Visualizer Mock (Elevation Profile) */}
      <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapCardTitleRow}>
            <FontAwesome6 name="route" size={13} color={colors.mBlue} />
            <Text style={[styles.mapCardTitle, { color: colors.text }]}>{t('routeElevationProfile')}</Text>
          </View>
          <Text style={[styles.mapCardActive, { color: colors.mBlue }]}>{t('gpsTrackActive')}</Text>
        </View>

        {/* Graphic SVG Map Elevation Trace */}
        <View style={styles.svgContainer}>
          <Svg width="100%" height={90} viewBox="0 0 300 80">
            <Defs>
              <SvgLinearGradient id="mTrackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors.mBlue} />
                <Stop offset="50%" stopColor={colors.mMotorsportBlue} />
                <Stop offset="100%" stopColor={colors.mRed} />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M 10 60 Q 50 10, 90 40 T 170 20 T 250 65 T 290 30"
              stroke="url(#mTrackGradient)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx="10" cy="60" r="5" fill={colors.mBlue} />
            <Circle cx="170" cy="20" r="4.5" fill={colors.mMotorsportBlue} />
            <Circle cx="290" cy="30" r="5" fill={colors.mRed} />
          </Svg>

          <View style={[styles.startTag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.startTagText, { color: colors.mBlue }]}>{t('startPoint')}</Text>
          </View>
          <View style={[styles.destTag, { backgroundColor: colors.mRedMuted, borderColor: colors.mRed }]}>
            <Text style={[styles.destTagText, { color: colors.mRed }]}>{t('destinationPeak')}</Text>
          </View>
        </View>
      </View>

      {/* Google Maps Destination & Navigation Action Card */}
      {(trip.destination || trip.googleMapsUrl) && (
        <View style={[styles.destCard, { backgroundColor: colors.card, borderColor: colors.mBlueMuted }]}>
          <View style={styles.destHeaderRow}>
            <View style={[styles.destIconBadge, { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue }]}>
              <FontAwesome6 name="location-dot" size={16} color={colors.mBlue} />
            </View>
            <View style={styles.destHeaderContent}>
              <View style={[styles.destBadgePill, { backgroundColor: colors.mBlueMuted }]}>
                <Text style={[styles.destBadgeText, { color: colors.mBlue }]}>
                  {trip.googleMapsUrl ? t('hasCustomMapLink') : t('pinnedDestination')}
                </Text>
              </View>
              <Text style={[styles.destTitleText, { color: colors.text }]} numberOfLines={1}>
                {language === 'VIE' && trip.destination?.nameVie ? trip.destination.nameVie : (trip.destination?.name || trip.title)}
              </Text>
            </View>
          </View>

          {trip.destination?.address ? (
            <Text style={[styles.destAddressText, { color: colors.textSecondary }]}>
              {trip.destination.address}
            </Text>
          ) : null}

          {/* Coordinates readout */}
          {trip.destination && (
            <View style={[styles.coordBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FontAwesome6 name="crosshairs" size={11} color={colors.mBlue} />
              <Text style={[styles.coordText, { color: colors.textMuted }]}>
                {t('coordinates')}: {trip.destination.latitude.toFixed(4)}° N, {trip.destination.longitude.toFixed(4)}° E
              </Text>
            </View>
          )}

          {/* Direct Google Maps Link Clickable Badge */}
          {(trip.googleMapsUrl || trip.destination?.mapUrl) && (
            <TouchableOpacity
              style={[styles.mapLinkBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => {
                showToast(t('mapsNavigationNotice'), 'info');
                openGoogleMapsLinkOrCoords(trip.googleMapsUrl || trip.destination?.mapUrl);
              }}
            >
              <FontAwesome6 name="arrow-up-right-from-square" size={12} color={colors.mBlue} />
              <Text style={[styles.mapLinkText, { color: colors.mBlue }]} numberOfLines={1}>
                {trip.googleMapsUrl || trip.destination?.mapUrl}
              </Text>
            </TouchableOpacity>
          )}

          {/* High-visibility Google Maps Navigation Button */}
          <TouchableOpacity
            style={styles.navGoogleBtn}
            activeOpacity={0.85}
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
            <LinearGradient
              colors={['#1A73E8', '#1557B0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.navGoogleBtnGradient}
            >
              <FontAwesome6 name={trip.googleMapsUrl ? 'arrow-up-right-from-square' : 'route'} size={15} color="#FFFFFF" />
              <Text style={styles.navGoogleBtnText}>
                {trip.googleMapsUrl ? t('openMapLink') : t('navigateWithGoogleMaps')}
              </Text>
              <AntDesign name="arrow-right" size={14} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Total Budget Summary Widget */}
      <View style={[styles.budgetWidget, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.budgetLeft}>
          <Text style={[styles.budgetLabel, { color: colors.textMuted }]} numberOfLines={1}>{t('estTotalTripBudget')}</Text>
          <Text style={[styles.budgetValue, { color: colors.text }]} numberOfLines={1}>
            {trip.totalCostVnd}{' '}
            <Text style={[styles.budgetUsd, { color: colors.textMuted }]}>({trip.totalCostUsd})</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.joinSlotBtn}
          activeOpacity={0.85}
          onPress={() => showToast(t('joinSlotRequested'), 'success')}
        >
          <LinearGradient
            colors={colors.mGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.joinSlotGradient}
          >
            <Text style={styles.joinSlotText}>{t('joinRideSlot')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Plan: Pit Stops (Eat & Drink) */}
      <View style={styles.planSection}>
        <View style={styles.planSectionHeader}>
          <FontAwesome6 name="utensils" size={13} color={colors.mBlue} />
          <Text style={[styles.planSectionTitle, { color: colors.text }]}>{t('plannedPitStops')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.eatDrink.map((item, idx) => (
            <View key={idx} style={[styles.planItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.planItemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.planItemSub, { color: colors.textMuted }]}>
                  {item.type} • {item.rating}
                </Text>
              </View>
              <View style={[styles.costBadge, { backgroundColor: colors.mBlueMuted }]}>
                <Text style={[styles.costBadgeText, { color: colors.mBlue }]}>{item.cost}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Plan: Destinations & Landmarks */}
      <View style={styles.planSection}>
        <View style={styles.planSectionHeader}>
          <FontAwesome6 name="camera-retro" size={13} color={colors.mRed} />
          <Text style={[styles.planSectionTitle, { color: colors.text }]}>{t('destinationsLandmarks')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.landmarks.map((landmark, idx) => (
            <View key={idx} style={[styles.planItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.planItemName, { color: colors.text }]}>{landmark.name}</Text>
                <Text style={[styles.planItemSub, { color: colors.textMuted }]}>
                  {t('stopDuration')}: {landmark.stopTime}
                </Text>
              </View>
              <View style={[styles.feeBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.feeBadgeText, { color: colors.textSecondary }]}>{landmark.fee}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Plan: Lodging & Stays */}
      <View style={styles.planSection}>
        <View style={styles.planSectionHeader}>
          <FontAwesome6 name="hotel" size={13} color={colors.mBlue} />
          <Text style={[styles.planSectionTitle, { color: colors.text }]}>{t('staysHotelLodging')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.lodging.map((lodge, idx) => (
            <View key={idx} style={[styles.planItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.planItemName, { color: colors.text }]}>{lodge.name}</Text>
                <Text style={[styles.planItemSub, { color: colors.textMuted }]}>{lodge.price}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.mBlueMuted }]}>
                <Text style={[styles.statusBadgeText, { color: colors.mBlue }]}>{lodge.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 14,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    minWidth: 0,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  saveBtnTextSaved: {
    color: '#EF4444',
  },
  exportBtn: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    gap: 4,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  authorSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  authorSubtitleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  authorNameText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bulletSeparator: {
    color: '#64748B',
    fontSize: 12,
  },
  bikeModelText: {
    fontSize: 11,
    color: '#FF5E1A',
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapCard: {
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    gap: 8,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  mapCardActive: {
    fontSize: 9,
    color: '#94A3B8',
  },
  svgContainer: {
    height: 90,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  startTag: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  startTagText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#FF9F1C',
  },
  destTag: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  destTagText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#00F2FE',
  },
  budgetWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 20, 15, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.3)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  budgetLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  budgetLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FF9F1C',
    marginTop: 2,
  },
  budgetUsd: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  joinSlotBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  joinSlotGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  joinSlotText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planSection: {
    backgroundColor: 'rgba(21, 28, 44, 0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    gap: 8,
  },
  planSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  planItemsList: {
    gap: 6,
  },
  planItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  planItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planItemSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  costBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  feeBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  feeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#34D399',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 94, 26, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FF5E1A',
  },
  destCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  destHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  destIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destHeaderContent: {
    flex: 1,
    gap: 2,
  },
  destBadgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  destBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  destTitleText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  destAddressText: {
    fontSize: 10.5,
    lineHeight: 15,
  },
  coordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  coordText: {
    fontSize: 9.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  navGoogleBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 2,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  navGoogleBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 8,
  },
  navGoogleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  mapLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  mapLinkText: {
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
    textDecorationLine: 'underline',
  },
});
