import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { mockTripsData, TripData } from '../data/mockTrips';
import { Vehicle } from '../data/mockVehicles';
import { UserDto } from '../services/authApi';

interface ProfileScreenProps {
  currentUser?: UserDto | null;
  onNavigateToTrip: (tripId: string) => void;
  onNavigateToVehicles: () => void;
  onNavigateToChangePwd: () => void;
  onLogout: () => void;
  savedTripIds: string[];
  vehicles: Vehicle[];
}

export default function ProfileScreen({
  currentUser,
  onNavigateToTrip,
  onNavigateToVehicles,
  onNavigateToChangePwd,
  onLogout,
  savedTripIds,
  vehicles,
}: ProfileScreenProps) {
  const { language, t, formatDistance } = useLanguage();
  const { permissionStatus, userLocation, requestLocationPermission } = useUserLocation();
  const [profileTab, setProfileTab] = useState<'saved' | 'created'>('saved');

  const savedTrips = mockTripsData.filter((t) => savedTripIds.includes(t.id));

  const avatarUrl =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
  const displayName = currentUser?.name || 'Alex "Viper" Mercer';
  const roleText = currentUser?.role || t('pro');
  const bioText = currentUser?.bio || t('riderBio');
  const pointCount = currentUser?.point != null ? currentUser.point : 1250;

  const handleLogoutPrompt = () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner & Header */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['#EA580C', '#D97706', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          <View style={styles.verifiedBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.verifiedBadgeText}>{t('verifiedRider')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: avatarUrl,
              }}
              style={styles.avatarImage}
            />
            <View style={styles.avatarBolt}>
              <FontAwesome6 name="bolt" size={8} color="#FFFFFF" />
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={onNavigateToChangePwd}
            activeOpacity={0.8}
          >
            <AntDesign name="setting" size={13} color="#FF5E1A" />
            <Text style={styles.settingsBtnText}>{t('settings')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{roleText}</Text>
          </View>
          <View style={[styles.proBadge, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
            <Text style={[styles.proBadgeText, { color: '#FBBF24' }]}>{pointCount} PTS</Text>
          </View>
        </View>
        {currentUser?.email ? (
          <Text style={[styles.userBio, { color: '#94A3B8', fontSize: 11, marginBottom: 2 }]}>
            {currentUser.email}
          </Text>
        ) : null}
        <Text style={styles.userBio}>{bioText}</Text>

        {/* Badges */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesContainer}
        >
          <View style={styles.achievementBadge}>
            <AntDesign name="safety" size={11} color="#FBBF24" />
            <Text style={[styles.achievementText, { color: '#FBBF24' }]}>
              {t('ironButt')}
            </Text>
          </View>

          <View style={styles.achievementBadge}>
            <FontAwesome6 name="mountain" size={10} color="#22D3EE" />
            <Text style={[styles.achievementText, { color: '#22D3EE' }]}>
              {t('haGiangMaster')}
            </Text>
          </View>

          <View style={styles.achievementBadge}>
            <AntDesign name="compass" size={11} color="#34D399" />
            <Text style={[styles.achievementText, { color: '#34D399' }]}>
              {t('trailblazer')}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Garage & Maintenance Shortcut Card */}
      <TouchableOpacity
        style={styles.card}
        onPress={onNavigateToVehicles}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <AntDesign name="car" size={14} color="#FF5E1A" />
            <Text style={styles.cardHeaderTitle}>{t('myVehicles')}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={styles.cardHeaderCount}>{vehicles.length} vehicles</Text>
            <AntDesign name="arrow-right" size={12} color="#FF9F1C" />
          </View>
        </View>

        <View style={styles.garageGrid}>
          {vehicles.slice(0, 2).map((veh) => (
            <View key={veh.id} style={styles.garageItem}>
              {veh.type === 'bike' ? (
                <FontAwesome6 name="motorcycle" size={16} color="#FF5E1A" />
              ) : (
                <AntDesign name="car" size={16} color="#00F2FE" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.garageItemTitle} numberOfLines={1}>{veh.name}</Text>
                <Text style={styles.garageItemSub}>{formatDistance(veh.currentOdoKm)}</Text>
              </View>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* Saved Trips vs Created Rides */}
      <View style={styles.card}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, profileTab === 'saved' && styles.tabBtnActive]}
            onPress={() => setProfileTab('saved')}
          >
            <Text
              style={[
                styles.tabBtnText,
                profileTab === 'saved' && styles.tabBtnTextActive,
              ]}
            >
              {t('savedTrips')} ({savedTripIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, profileTab === 'created' && styles.tabBtnActive]}
            onPress={() => setProfileTab('created')}
          >
            <Text
              style={[
                styles.tabBtnText,
                profileTab === 'created' && styles.tabBtnTextActive,
              ]}
            >
              {t('createdRides')} (2)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {profileTab === 'saved' ? (
          <View style={styles.tripsList}>
            {savedTrips.length === 0 ? (
              <Text style={styles.emptyText}>{t('noSavedTrips')}</Text>
            ) : (
              savedTrips.map((trip: TripData) => {
                const displayTitle = language === 'VIE' ? trip.titleVie : trip.title;
                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.savedTripItem}
                    onPress={() => onNavigateToTrip(trip.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.savedTripLeft}>
                      <Image source={{ uri: trip.coverImage }} style={styles.savedTripThumb} />
                      <View style={styles.savedTripTextWrapper}>
                        <Text style={styles.savedTripTitle} numberOfLines={1}>{displayTitle}</Text>
                        <Text style={styles.savedTripSub} numberOfLines={1}>
                          {formatDistance(trip.distanceKm)} • {trip.riderName}
                        </Text>
                      </View>
                    </View>
                    <AntDesign name="arrow-right" size={12} color="#64748B" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.tripsList}>
            <TouchableOpacity
              style={styles.savedTripItem}
              onPress={() => onNavigateToTrip('trip-1')}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.savedTripTitle}>
                  Saigon to Da Lat Highland Run
                </Text>
                <Text style={styles.savedTripSub}>
                  {formatDistance(300)} • Created 2 weeks ago
                </Text>
              </View>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{t('active')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account Settings & Logout */}
      <View style={styles.accountLinksSection}>
        {/* GPS Location & Telemetry Tile */}
        <TouchableOpacity
          style={styles.accountLinkBtn}
          onPress={() => requestLocationPermission()}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign
              name="environment"
              size={14}
              color={permissionStatus === 'granted' ? '#10B981' : '#FF9F1C'}
            />
            <View style={styles.accountLinkTextWrapper}>
              <Text style={styles.accountLinkText}>
                {permissionStatus === 'granted' ? t('locationActive') : t('locationPermissionTitle')}
              </Text>
              <Text style={styles.accountLinkSub} numberOfLines={1}>
                {permissionStatus === 'granted'
                  ? `${userLocation?.city || 'Vietnam'} (${userLocation?.latitude.toFixed(2)}°, ${userLocation?.longitude.toFixed(2)}°)`
                  : t('grantLocationBtn')}
              </Text>
            </View>
          </View>
          <AntDesign
            name={permissionStatus === 'granted' ? 'check-circle' : 'arrow-right'}
            size={12}
            color={permissionStatus === 'granted' ? '#10B981' : '#64748B'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.accountLinkBtn}
          onPress={onNavigateToChangePwd}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign name="lock" size={14} color="#FF5E1A" />
            <Text style={styles.accountLinkText}>{t('changeAccountPassword')}</Text>
          </View>
          <AntDesign name="arrow-right" size={12} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogoutPrompt}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign name="logout" size={14} color="#EF4444" />
            <Text style={styles.logoutBtnText}>{t('logout')}</Text>
          </View>
          <AntDesign name="arrow-right" size={12} color="#EF4444" />
        </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  bannerContainer: {
    marginBottom: 6,
  },
  bannerGradient: {
    height: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  verifiedBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -38,
    paddingHorizontal: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 3.5,
    borderColor: '#0B0F17',
  },
  avatarBolt: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5E1A',
    borderWidth: 1.5,
    borderColor: '#0B0F17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  infoSection: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 94, 26, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 94, 26, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF5E1A',
  },
  userBio: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  achievementText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CBD5E1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardHeaderCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9F1C',
  },
  garageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  garageItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 8,
    borderRadius: 12,
  },
  garageItemTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  garageItemSub: {
    fontSize: 8.5,
    color: '#00F2FE',
    fontWeight: '700',
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5E1A',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FF5E1A',
  },
  tripsList: {
    gap: 8,
    paddingTop: 4,
  },
  emptyText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 12,
  },
  savedTripItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 8,
    borderRadius: 12,
  },
  savedTripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginRight: 8,
  },
  savedTripTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  savedTripThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    flexShrink: 0,
  },
  savedTripTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  savedTripSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  activePill: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#34D399',
  },
  accountLinksSection: {
    gap: 8,
  },
  accountLinkBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 28, 44, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  accountLinkLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginRight: 8,
  },
  accountLinkTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  accountLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  accountLinkSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  logoutBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
});
