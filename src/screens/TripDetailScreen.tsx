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
import { mockTripsData, TripData } from '../data/mockTrips';

interface TripDetailScreenProps {
  tripId: string;
  onBack: () => void;
  savedTripIds: string[];
  onToggleSaveTrip: (tripId: string) => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function TripDetailScreen({
  tripId,
  onBack,
  savedTripIds,
  onToggleSaveTrip,
  showToast,
}: TripDetailScreenProps) {
  const { language, t, formatDistance, formatSpeed } = useLanguage();

  const trip: TripData =
    mockTripsData.find((t) => t.id === tripId) ?? mockTripsData[0];
  const isSaved = savedTripIds.includes(trip.id);

  const displayTitle = language === 'VIE' ? trip.titleVie : trip.title;
  const displayDescription = language === 'VIE' ? trip.descriptionVie : trip.description;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Detail Header Controls */}
      <View style={styles.headerControls}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <AntDesign name="arrow-left" size={16} color="#CBD5E1" />
          <Text style={styles.backBtnText} numberOfLines={1}>{t('backToFeed')}</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => onToggleSaveTrip(trip.id)}
            activeOpacity={0.8}
          >
            <AntDesign
              name="heart"
              size={14}
              color={isSaved ? '#EF4444' : '#64748B'}
            />
            <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextSaved]} numberOfLines={1}>
              {isSaved ? t('savedInFavorites') : t('saveTrip')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => showToast(t('gpxExported'), 'success')}
            activeOpacity={0.8}
          >
            <AntDesign name="export" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title & Author Info */}
      <View style={styles.titleSection}>
        <Text style={styles.tripTitle}>{displayTitle}</Text>
        <View style={styles.authorSubtitleRow}>
          <Text style={styles.authorSubtitleText}>
            {t('by')} <Text style={styles.authorNameText}>{trip.riderName}</Text>
          </Text>
          <Text style={styles.bulletSeparator}>•</Text>
          <Text style={styles.bikeModelText}>{trip.bikeModel}</Text>
        </View>
        <Text style={styles.descriptionText}>{displayDescription}</Text>
      </View>

      {/* 4 Telemetry Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('distance')}</Text>
          <Text style={styles.statValue}>{formatDistance(trip.distanceKm)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('avgSpeed')}</Text>
          <Text style={[styles.statValue, { color: '#38BDF8' }]}>
            {formatSpeed(trip.avgVelocityKmh)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('maxSpeed')}</Text>
          <Text style={[styles.statValue, { color: '#FF9F1C' }]}>
            {formatSpeed(trip.maxVelocityKmh)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('group')}</Text>
          <Text style={[styles.statValue, { color: '#34D399' }]}>
            {trip.groupSize.split(' ')[0]}
          </Text>
        </View>
      </View>

      {/* Dynamic Dark Mode Route Map Visualizer Mock (Elevation Profile) */}
      <View style={styles.mapCard}>
        <View style={styles.mapCardHeader}>
          <View style={styles.mapCardTitleRow}>
            <AntDesign name="dashboard" size={13} color="#FF5E1A" />
            <Text style={styles.mapCardTitle}>{t('routeElevationProfile')}</Text>
          </View>
          <Text style={styles.mapCardActive}>{t('gpsTrackActive')}</Text>
        </View>

        {/* Graphic SVG Map Elevation Trace */}
        <View style={styles.svgContainer}>
          <Svg width="100%" height={90} viewBox="0 0 300 80">
            <Defs>
              <SvgLinearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF9F1C" />
                <Stop offset="50%" stopColor="#FF5E1A" />
                <Stop offset="100%" stopColor="#00F2FE" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M 10 60 Q 50 10, 90 40 T 170 20 T 250 65 T 290 30"
              stroke="url(#orangeGradient)"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx="10" cy="60" r="5" fill="#FF9F1C" />
            <Circle cx="170" cy="20" r="4.5" fill="#FF5E1A" />
            <Circle cx="290" cy="30" r="5" fill="#00F2FE" />
          </Svg>

          <View style={styles.startTag}>
            <Text style={styles.startTagText}>{t('startPoint')}</Text>
          </View>
          <View style={styles.destTag}>
            <Text style={styles.destTagText}>{t('destinationPeak')}</Text>
          </View>
        </View>
      </View>

      {/* Total Budget Summary Widget */}
      <View style={styles.budgetWidget}>
        <View>
          <Text style={styles.budgetLabel}>{t('estTotalTripBudget')}</Text>
          <Text style={styles.budgetValue}>
            {trip.totalCostVnd}{' '}
            <Text style={styles.budgetUsd}>({trip.totalCostUsd})</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.joinSlotBtn}
          activeOpacity={0.85}
          onPress={() => showToast(t('joinSlotRequested'), 'success')}
        >
          <LinearGradient
            colors={['#FF5E1A', '#FF9F1C']}
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
          <FontAwesome6 name="utensils" size={13} color="#FF5E1A" />
          <Text style={styles.planSectionTitle}>{t('plannedPitStops')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.eatDrink.map((item, idx) => (
            <View key={idx} style={styles.planItemCard}>
              <View>
                <Text style={styles.planItemName}>{item.name}</Text>
                <Text style={styles.planItemSub}>
                  {item.type} • {item.rating}
                </Text>
              </View>
              <View style={styles.costBadge}>
                <Text style={styles.costBadgeText}>{item.cost}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Plan: Destinations & Landmarks */}
      <View style={styles.planSection}>
        <View style={styles.planSectionHeader}>
          <FontAwesome6 name="camera-retro" size={13} color="#38BDF8" />
          <Text style={styles.planSectionTitle}>{t('destinationsLandmarks')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.landmarks.map((landmark, idx) => (
            <View key={idx} style={styles.planItemCard}>
              <View>
                <Text style={styles.planItemName}>{landmark.name}</Text>
                <Text style={styles.planItemSub}>
                  {t('stopDuration')}: {landmark.stopTime}
                </Text>
              </View>
              <View style={styles.feeBadge}>
                <Text style={styles.feeBadgeText}>{landmark.fee}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Plan: Lodging & Stays */}
      <View style={styles.planSection}>
        <View style={styles.planSectionHeader}>
          <FontAwesome6 name="hotel" size={13} color="#C084FC" />
          <Text style={styles.planSectionTitle}>{t('staysHotelLodging')}</Text>
        </View>
        <View style={styles.planItemsList}>
          {trip.lodging.map((lodge, idx) => (
            <View key={idx} style={styles.planItemCard}>
              <View>
                <Text style={styles.planItemName}>{lodge.name}</Text>
                <Text style={styles.planItemSub}>{lodge.price}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{lodge.status}</Text>
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
  },
  budgetLabel: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  budgetValue: {
    fontSize: 16,
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
});
