import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { UserDto } from '../services/authApi';
import { SosResponseDto, fetchSosByIdApi, updateSosStatusApi } from '../services/sosApi';
import { openGoogleMapsLocation } from '../utils/mapUtils';

interface SosDetailScreenProps {
  sosId?: string;
  initialSosData?: Partial<SosResponseDto> | null;
  currentUser: UserDto | null;
  onBack: () => void;
  onOpenDirectChat?: (otherUserId: string, otherUserName: string, otherAvatar?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info') => void;
}

export default function SosDetailScreen({
  sosId,
  initialSosData,
  currentUser,
  onBack,
  onOpenDirectChat,
  showToast,
}: SosDetailScreenProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userLocation } = useUserLocation();

  const [sos, setSos] = useState<SosResponseDto | null>(() => {
    if (initialSosData && initialSosData.id) {
      return initialSosData as SosResponseDto;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!initialSosData);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (sosId) {
      fetchSosByIdApi(sosId)
        .then((data) => {
          if (isMounted && data) {
            setSos(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [sosId]);

  const handleCallPhone = (phone?: string) => {
    if (!phone) {
      if (showToast) showToast('Rider has not provided a phone number', 'info');
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const url = `tel:${cleanPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          if (showToast) showToast(`Phone: ${phone}`, 'info');
        }
      })
      .catch(() => {
        if (showToast) showToast(`Phone: ${phone}`, 'info');
      });
  };

  const handleOpenMaps = () => {
    if (!sos) return;
    const lat = sos.latitude || 11.9404;
    const lng = sos.longitude || 108.4583;
    const label = `${sos.userName || 'Rider'} SOS - ${sos.name || 'Emergency'}`;
    openGoogleMapsLocation(lat, lng, label);
  };

  const handleUpdateStatus = async (newStatus: 'HELPING' | 'RESOLVED') => {
    if (!sos) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateSosStatusApi(sos.id, newStatus);
      setSos(updated);
      if (showToast) {
        showToast(
          newStatus === 'HELPING'
            ? 'Thank you! You marked that you are on your way to help 🏍️'
            : 'SOS marked as resolved ✅',
          'success'
        );
      }
    } catch {
      if (showToast) showToast('Failed to update status', 'info');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (mins < 60) return `${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hr ago`;
      return `${Math.floor(hrs / 24)} days ago`;
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Emergency SOS Details...</Text>
      </View>
    );
  }

  if (!sos) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <FontAwesome6 name="triangle-exclamation" size={48} color="#EF4444" />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>SOS Request Not Found</Text>
        <Text style={[styles.notFoundSubtitle, { color: colors.textMuted }]}>
          This emergency request may have been resolved or cancelled.
        </Text>
        <TouchableOpacity style={[styles.backActionBtn, { backgroundColor: colors.mBlue }]} onPress={onBack}>
          <AntDesign name="arrow-left" size={16} color="#FFFFFF" />
          <Text style={styles.backActionBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isResolved = sos.status === 'RESOLVED';
  const isHelping = sos.status === 'HELPING';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Emergency Alert Header Banner */}
        <LinearGradient
          colors={
            isResolved
              ? ['#10B981', '#059669']
              : isHelping
              ? ['#3B82F6', '#1D4ED8']
              : ['#EF4444', '#B91C1C']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.alertBanner}
        >
          <View style={styles.alertBannerTop}>
            <View style={styles.pulsePill}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>
                {isResolved ? 'RESOLVED' : isHelping ? 'RESCUE IN PROGRESS' : 'ACTIVE EMERGENCY'}
              </Text>
            </View>
            <Text style={styles.alertTimeText}>{formatTimeAgo(sos.createdAt)}</Text>
          </View>

          <Text style={styles.alertTitle}>{sos.name}</Text>

          <View style={styles.distanceBadgeRow}>
            <FontAwesome6 name="location-arrow" size={12} color="#FFFFFF" />
            <Text style={styles.distanceBadgeText}>
              {sos.distanceKm ? `Approx. ${sos.distanceKm} km away from you` : 'Nearby Roadside Alert (Within 10 km)'}
            </Text>
          </View>
        </LinearGradient>

        {/* 1. Rider Information Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome6 name="user-shield" size={14} color={colors.mBlue} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Rider In Need of Help</Text>
          </View>

          <View style={styles.riderRow}>
            <Image
              source={{
                uri:
                  sos.userAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
              }}
              style={styles.riderAvatar}
            />
            <View style={styles.riderDetails}>
              <Text style={[styles.riderName, { color: colors.text }]} numberOfLines={1}>
                {sos.userName || 'Adventure Rider'}
              </Text>
              <Text style={[styles.riderRole, { color: colors.textMuted }]}>
                🏍️ WayMate Community Member
              </Text>
              {sos.phoneNumber ? (
                <Text style={[styles.riderPhoneText, { color: colors.mBlue }]}>
                  📞 {sos.phoneNumber}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Quick Communication Actions */}
          <View style={styles.actionButtonsRow}>
            {sos.phoneNumber ? (
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleCallPhone(sos.phoneNumber)}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="phone" size={13} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>Call Phone</Text>
              </TouchableOpacity>
            ) : null}

            {onOpenDirectChat && sos.userId && (
              <TouchableOpacity
                style={[styles.chatBtn, { backgroundColor: colors.mBlue }]}
                onPress={() => onOpenDirectChat(sos.userId, sos.userName || 'Rider', sos.userAvatar)}
                activeOpacity={0.8}
              >
                <AntDesign name="message" size={14} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>Chat Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2. Motorcycle / Bike Details Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome6 name="motorcycle" size={14} color={colors.mRed} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Motorcycle & Issue Details</Text>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>BIKE MODEL & PLATE</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {sos.bikeInfo || 'Motorcycle (Plate details not registered)'}
            </Text>
          </View>

          {sos.description ? (
            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.borderSubtle, marginTop: 8 }]}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>SITUATION DESCRIPTION</Text>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                "{sos.description}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* 3. Map Location & Google Maps Navigation Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome6 name="map-location-dot" size={14} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>GPS Location & Navigation</Text>
          </View>

          <View style={[styles.locationWrap, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <FontAwesome6 name="location-dot" size={18} color="#EF4444" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressText, { color: colors.text }]}>
                {sos.location || 'Current GPS Location'}
              </Text>
              <Text style={[styles.coordsText, { color: colors.textMuted }]}>
                Coordinates: {sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)}
              </Text>
            </View>
          </View>

          {/* Big Prominent Google Maps Action Button */}
          <TouchableOpacity
            style={styles.openMapsLargeBtn}
            onPress={handleOpenMaps}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#1A73E8', '#1557B0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.openMapsGradient}
            >
              <FontAwesome6 name="diamond-turn-right" size={18} color="#FFFFFF" />
              <View style={styles.mapsBtnTexts}>
                <Text style={styles.mapsBtnMainText}>Open in Google Maps</Text>
                <Text style={styles.mapsBtnSubText}>View route, ETA & navigate to rider</Text>
              </View>
              <AntDesign name="arrow-right" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 4. Help Status Progression Action */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome6 name="hand-holding-hand" size={14} color={colors.mBlue} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Assistance Status</Text>
          </View>

          <Text style={[styles.statusExplText, { color: colors.textMuted }]}>
            If you are nearby and able to assist this rider, let the community know so other rescuers can coordinate.
          </Text>

          <View style={styles.statusButtonsRow}>
            {!isHelping && !isResolved && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: colors.mBlue }]}
                onPress={() => handleUpdateStatus('HELPING')}
                disabled={isUpdatingStatus}
                activeOpacity={0.8}
              >
                <FontAwesome6 name="person-running" size={14} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>I Am On My Way To Help</Text>
              </TouchableOpacity>
            )}

            {!isResolved && (
              <TouchableOpacity
                style={[styles.statusActionBtn, { backgroundColor: '#10B981', marginTop: isHelping ? 0 : 8 }]}
                onPress={() => handleUpdateStatus('RESOLVED')}
                disabled={isUpdatingStatus}
                activeOpacity={0.8}
              >
                <AntDesign name="check-circle" size={15} color="#FFFFFF" />
                <Text style={styles.btnTextWhite}>Mark SOS as Resolved</Text>
              </TouchableOpacity>
            )}

            {isResolved && (
              <View style={[styles.resolvedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                <AntDesign name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.resolvedText, { color: '#10B981' }]}>
                  This emergency has been successfully resolved.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  notFoundSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  backActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  alertBanner: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  alertBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pulseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  alertTimeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  alertTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  riderDetails: {
    flex: 1,
    gap: 2,
  },
  riderName: {
    fontSize: 17,
    fontWeight: '800',
  },
  riderRole: {
    fontSize: 12,
  },
  riderPhoneText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  coordsText: {
    fontSize: 11,
    marginTop: 2,
  },
  openMapsLargeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  openMapsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  mapsBtnTexts: {
    flex: 1,
  },
  mapsBtnMainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  mapsBtnSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
  },
  statusExplText: {
    fontSize: 12,
    lineHeight: 18,
  },
  statusButtonsRow: {
    gap: 8,
  },
  statusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
