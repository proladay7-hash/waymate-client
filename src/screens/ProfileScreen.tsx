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
import { useTheme } from '../context/ThemeContext';
import { TripData } from '../data/mockTrips';
import { Vehicle } from '../data/mockVehicles';
import { UserDto } from '../services/authApi';

interface ProfileScreenProps {
  currentUser?: UserDto | null;
  onNavigateToTrip: (tripId: string) => void;
  onNavigateToVehicles: () => void;
  onNavigateToChangePwd: () => void;
  onLogout: () => void;
  savedTripIds: string[];
  trips?: TripData[];
  vehicles: Vehicle[];
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function ProfileScreen({
  currentUser,
  trips = [],
  onNavigateToTrip,
  onNavigateToVehicles,
  onNavigateToChangePwd,
  onLogout,
  savedTripIds,
  vehicles,
  showToast,
}: ProfileScreenProps) {
  const { language, t, formatDistance } = useLanguage();
  const { permissionStatus, userLocation, requestLocationPermission } = useUserLocation();
  const { themeMode, isDark, toggleTheme, setThemeMode, colors } = useTheme();
  const [profileTab, setProfileTab] = useState<'saved' | 'created'>('saved');

  const savedTrips = trips.filter((t) => savedTripIds.includes(t.id));

  const avatarUrl =
    currentUser?.avatar ||
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80';
  const displayName = currentUser?.name || 'Rider';
  const roleText = currentUser?.role || t('pro');
  const bioText = currentUser?.bio || t('riderBio');
  const pointCount = currentUser?.point != null ? currentUser.point : 0;

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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner & Header */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={colors.mGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={[styles.bannerGradient, { borderColor: colors.border }]}
        >
          <View style={[styles.verifiedBadge, { backgroundColor: isDark ? 'rgba(8, 11, 17, 0.85)' : 'rgba(255, 255, 255, 0.9)' }]}>
            <View style={[styles.pulseDot, { backgroundColor: colors.mBlue }]} />
            <Text style={[styles.verifiedBadgeText, { color: colors.mBlue }]}>{t('verifiedRider')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: avatarUrl,
              }}
              style={[styles.avatarImage, { borderColor: colors.background }]}
            />
            <View style={[styles.avatarBolt, { backgroundColor: colors.mRed, borderColor: colors.background }]}>
              <FontAwesome6 name="bolt" size={8} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.infoSection}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          <View style={[styles.proBadge, { backgroundColor: colors.mBlueMuted, borderColor: colors.mBlue }]}>
            <Text style={[styles.proBadgeText, { color: colors.mBlue }]}>{roleText}</Text>
          </View>
          <View style={[styles.proBadge, { backgroundColor: colors.mRedMuted, borderColor: colors.mRed }]}>
            <Text style={[styles.proBadgeText, { color: colors.mRed }]}>{pointCount} PTS</Text>
          </View>
        </View>
        {currentUser?.email ? (
          <Text style={[styles.userBio, { color: colors.textMuted, fontSize: 11, marginBottom: 2 }]}>
            {currentUser.email}
          </Text>
        ) : null}
        <Text style={[styles.userBio, { color: colors.textSecondary }]}>{bioText}</Text>

        {/* Badges */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesContainer}
        >
          <View style={[styles.achievementBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AntDesign name="safety" size={11} color={colors.mBlue} />
            <Text style={[styles.achievementText, { color: colors.mBlue }]}>
              {t('ironButt')}
            </Text>
          </View>

          <View style={[styles.achievementBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FontAwesome6 name="motorcycle" size={10} color={colors.mRed} />
            <Text style={[styles.achievementText, { color: colors.mRed }]}>
              {t('haGiangMaster')}
            </Text>
          </View>

          <View style={[styles.achievementBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AntDesign name="compass" size={11} color={colors.success} />
            <Text style={[styles.achievementText, { color: colors.success }]}>
              {t('trailblazer')}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Theme Switcher Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FontAwesome6 name="palette" size={13} color={colors.mBlue} />
            <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>{t('themeMode')}</Text>
          </View>
          <Text style={[styles.cardHeaderCount, { color: colors.mBlue }]}>
            {isDark ? t('themeDark') : t('themeLight')}
          </Text>
        </View>

        <View style={styles.themeOptionsRow}>
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              isDark && { borderColor: colors.mBlue, backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => {
              setThemeMode('dark');
              showToast?.(`${t('themeSwitched')}: ${t('themeDark')}`, 'info');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.themeOptionHeader}>
              <FontAwesome6 name="moon" size={14} color={isDark ? colors.mBlue : colors.textMuted} />
              <View style={[styles.radioCircle, { borderColor: isDark ? colors.mBlue : colors.border }]}>
                {isDark && <View style={[styles.radioDot, { backgroundColor: colors.mBlue }]} />}
              </View>
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>{t('themeDark')}</Text>
            <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>Carbon Dark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !isDark && { borderColor: colors.mRed, backgroundColor: colors.surfaceElevated },
            ]}
            onPress={() => {
              setThemeMode('light');
              showToast?.(`${t('themeSwitched')}: ${t('themeLight')}`, 'info');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.themeOptionHeader}>
              <FontAwesome6 name="sun" size={14} color={!isDark ? colors.mRed : colors.textMuted} />
              <View style={[styles.radioCircle, { borderColor: !isDark ? colors.mRed : colors.border }]}>
                {!isDark && <View style={[styles.radioDot, { backgroundColor: colors.mRed }]} />}
              </View>
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>{t('themeLight')}</Text>
            <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>Alpine Light</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Garage & Maintenance Shortcut Card */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onNavigateToVehicles}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <FontAwesome6 name="motorcycle" size={13} color={colors.mBlue} />
            <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>{t('myVehicles')}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <Text style={[styles.cardHeaderCount, { color: colors.mBlue }]}>{vehicles.length} vehicles</Text>
            <AntDesign name="arrow-right" size={12} color={colors.mBlue} />
          </View>
        </View>

        <View style={styles.garageGrid}>
          {vehicles.slice(0, 2).map((veh) => (
            <View key={veh.id} style={[styles.garageItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {veh.type === 'bike' ? (
                <FontAwesome6 name="motorcycle" size={16} color={colors.mBlue} />
              ) : (
                <AntDesign name="car" size={16} color={colors.mRed} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.garageItemTitle, { color: colors.text }]} numberOfLines={1}>{veh.name}</Text>
                <Text style={[styles.garageItemSub, { color: colors.mBlue }]}>{formatDistance(veh.currentOdoKm)}</Text>
              </View>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* Saved Trips vs Created Rides */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, profileTab === 'saved' && { borderBottomWidth: 2, borderBottomColor: colors.mBlue }]}
            onPress={() => setProfileTab('saved')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: profileTab === 'saved' ? colors.mBlue : colors.textMuted },
                profileTab === 'saved' && { fontWeight: '800' },
              ]}
            >
              {t('savedTrips')} ({savedTripIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, profileTab === 'created' && { borderBottomWidth: 2, borderBottomColor: colors.mRed }]}
            onPress={() => setProfileTab('created')}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: profileTab === 'created' ? colors.mRed : colors.textMuted },
                profileTab === 'created' && { fontWeight: '800' },
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
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('noSavedTrips')}</Text>
            ) : (
              savedTrips.map((trip: TripData) => {
                const displayTitle = language === 'VIE' ? trip.titleVie : trip.title;
                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[styles.savedTripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onNavigateToTrip(trip.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.savedTripLeft}>
                      <Image source={{ uri: trip.coverImage }} style={styles.savedTripThumb} />
                      <View style={styles.savedTripTextWrapper}>
                        <Text style={[styles.savedTripTitle, { color: colors.text }]} numberOfLines={1}>{displayTitle}</Text>
                        <Text style={[styles.savedTripSub, { color: colors.textMuted }]} numberOfLines={1}>
                          {formatDistance(trip.distanceKm)} • {trip.riderName}
                        </Text>
                      </View>
                    </View>
                    <AntDesign name="arrow-right" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.tripsList}>
            <TouchableOpacity
              style={[styles.savedTripItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => onNavigateToTrip('trip-1')}
              activeOpacity={0.8}
            >
              <View>
                <Text style={[styles.savedTripTitle, { color: colors.text }]}>
                  Saigon to Da Lat Highland Run
                </Text>
                <Text style={[styles.savedTripSub, { color: colors.textMuted }]}>
                  {formatDistance(300)} • Created 2 weeks ago
                </Text>
              </View>
              <View style={[styles.activePill, { backgroundColor: colors.mBlueMuted }]}>
                <Text style={[styles.activePillText, { color: colors.mBlue }]}>{t('active')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account Settings & Logout */}
      <View style={styles.accountLinksSection}>
        {/* GPS Location & Telemetry Tile */}
        <TouchableOpacity
          style={[styles.accountLinkBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => requestLocationPermission()}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign
              name="environment"
              size={14}
              color={permissionStatus === 'granted' ? colors.success : colors.mBlue}
            />
            <View style={styles.accountLinkTextWrapper}>
              <Text style={[styles.accountLinkText, { color: colors.text }]}>
                {permissionStatus === 'granted' ? t('locationActive') : t('locationPermissionTitle')}
              </Text>
              <Text style={[styles.accountLinkSub, { color: colors.textMuted }]} numberOfLines={1}>
                {permissionStatus === 'granted'
                  ? `${userLocation?.city || 'Vietnam'} (${userLocation?.latitude.toFixed(2)}°, ${userLocation?.longitude.toFixed(2)}°)`
                  : t('grantLocationBtn')}
              </Text>
            </View>
          </View>
          <AntDesign
            name={permissionStatus === 'granted' ? 'check-circle' : 'arrow-right'}
            size={12}
            color={permissionStatus === 'granted' ? colors.success : colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.accountLinkBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onNavigateToChangePwd}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign name="lock" size={14} color={colors.mBlue} />
            <Text style={[styles.accountLinkText, { color: colors.text }]}>{t('changeAccountPassword')}</Text>
          </View>
          <AntDesign name="arrow-right" size={12} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.mRedMuted, borderColor: colors.mRed }]}
          onPress={handleLogoutPrompt}
          activeOpacity={0.75}
        >
          <View style={styles.accountLinkLeft}>
            <AntDesign name="logout" size={14} color={colors.mRed} />
            <Text style={[styles.logoutBtnText, { color: colors.mRed }]}>{t('logout')}</Text>
          </View>
          <AntDesign name="arrow-right" size={12} color={colors.mRed} />
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
  themeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeOptionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  themeOptionDesc: {
    fontSize: 9.5,
  },
});
