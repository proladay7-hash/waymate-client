import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import * as Location from 'expo-location';
import { UserDto } from '../services/authApi';
import { sendSosApi } from '../services/sosApi';
import { triggerLocalPhoneNotification } from '../services/notificationService';

interface SosEmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserDto | null;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const EMERGENCY_TYPES = [
  { id: 'flat_tyre', name: 'Flat Tyre / Thủng lốp', icon: 'circle-dot', tip: 'Puncture repair / pump needed' },
  { id: 'battery', name: 'Dead Battery / Hết bình', icon: 'bolt', tip: 'Jump start / battery recharge' },
  { id: 'petrol', name: 'Out of Petrol / Hết xăng', icon: 'gas-pump', tip: 'Need 1-2L fuel to reach station' },
  { id: 'chain', name: 'Chain Snapped / Đứt xích', icon: 'link', tip: 'Chain breaker / master link needed' },
  { id: 'engine', name: 'Engine Breakdown / Chết máy', icon: 'gears', tip: 'Overheating or spark plug issue' },
  { id: 'accident', name: 'Accident / Va quẹt', icon: 'triangle-exclamation', tip: 'First aid / roadside assistance' },
  { id: 'other', name: 'Other Bike Problem / Khác', icon: 'wrench', tip: 'General roadside support' },
];

export default function SosEmergencyModal({
  visible,
  onClose,
  currentUser,
  showToast,
}: SosEmergencyModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userLocation } = useUserLocation();

  const [selectedType, setSelectedType] = useState(EMERGENCY_TYPES[0].name);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [bikeInfo, setBikeInfo] = useState('');
  const [currentLat, setCurrentLat] = useState<number>(11.9404);
  const [currentLng, setCurrentLng] = useState<number>(108.4583);
  const [detectedLocation, setDetectedLocation] = useState<string>('Acquiring current GPS location...');
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (visible) {
      if (currentUser?.phoneNumber) {
        setPhone(currentUser.phoneNumber);
      }
      setBikeInfo('Honda CB500X • 59-X1 999.88');
      setIsLocating(true);

      // Auto-detect current satellite GPS location on modal preview
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCurrentLat(lat);
            setCurrentLng(lng);

            try {
              const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
              if (!isMounted) return;
              if (geo && geo.length > 0) {
                const p = geo[0];
                const parts = [p.street || p.name, p.district || p.subregion, p.city || p.region].filter(Boolean);
                setDetectedLocation(parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
              } else {
                setDetectedLocation(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
              }
            } catch {
              if (isMounted) {
                setDetectedLocation(`${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`);
              }
            }
          } else if (userLocation) {
            if (!isMounted) return;
            setCurrentLat(userLocation.latitude);
            setCurrentLng(userLocation.longitude);
            setDetectedLocation(userLocation.city ? `${userLocation.city}, ${userLocation.region || 'Việt Nam'}` : `${userLocation.latitude.toFixed(5)}°N, ${userLocation.longitude.toFixed(5)}°E`);
          } else {
            if (!isMounted) return;
            setCurrentLat(11.9404);
            setCurrentLng(108.4583);
            setDetectedLocation('Đèo Prenn, TP. Đà Lạt, Lâm Đồng');
          }
        } catch {
          if (!isMounted) return;
          if (userLocation) {
            setCurrentLat(userLocation.latitude);
            setCurrentLng(userLocation.longitude);
            setDetectedLocation(userLocation.city ? `${userLocation.city}, ${userLocation.region || 'Việt Nam'}` : `${userLocation.latitude.toFixed(5)}°N, ${userLocation.longitude.toFixed(5)}°E`);
          } else {
            setCurrentLat(11.9404);
            setCurrentLng(108.4583);
            setDetectedLocation('Đèo Prenn, TP. Đà Lạt, Lâm Đồng');
          }
        } finally {
          if (isMounted) setIsLocating(false);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [visible, currentUser, userLocation]);

  const handleSendSos = async () => {
    if (!currentUser) {
      if (showToast) showToast('Please sign in to send SOS assistance', 'info');
      return;
    }

    const lat = currentLat;
    const lng = currentLng;
    const locText = detectedLocation || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    setIsSending(true);
    try {
      const created = await sendSosApi({
        userId: currentUser.id,
        name: selectedType,
        location: locText,
        latitude: lat,
        longitude: lng,
        description: description.trim() || 'Urgent bike assistance requested.',
        phoneNumber: phone.trim() || currentUser.phoneNumber || '0901234567',
        bikeInfo: bikeInfo.trim() || 'Motorcycle',
      });

      triggerLocalPhoneNotification(
        `🚨 SOS Alert: ${selectedType}`,
        `Broadcasted to all riders within 10km around ${locText}. Help is on the way!`,
        {
          type: 'SOS',
          sosId: created.id,
          location: created.location,
          lat: created.latitude,
          lng: created.longitude,
          phone: created.phoneNumber,
          bikeInfo: created.bikeInfo,
          senderName: currentUser.name || 'You',
          senderAvatar: currentUser.avatar,
        },
        'emergency-sos'
      );

      if (showToast) {
        showToast('🚨 SOS broadcasted to all riders within 10km!', 'success');
      }
      onClose();
    } catch (err: any) {
      if (showToast) {
        showToast('Failed to broadcast SOS. Check network.', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerIconRing}>
                <FontAwesome6 name="triangle-exclamation" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>EMERGENCY SOS ALERT</Text>
                <Text style={styles.headerSubtitle}>Broadcast roadside alert to riders within 10km</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AntDesign name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 10km Radius Warning Banner */}
            <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: '#EF4444' }]}>
              <FontAwesome6 name="tower-broadcast" size={14} color="#EF4444" />
              <Text style={[styles.warningText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                This will persist an SOS alert in the database and push an emergency notification to all WayMate riders within a <Text style={{ fontWeight: '800' }}>10 km radius</Text>.
              </Text>
            </View>

            {/* Emergency Type Selector */}
            <Text style={[styles.label, { color: colors.text }]}>What problem is your bike having?</Text>
            <View style={styles.typeGrid}>
              {EMERGENCY_TYPES.map((type) => {
                const isSelected = selectedType === type.name;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.15)' : colors.card,
                        borderColor: isSelected ? '#EF4444' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedType(type.name)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6
                      name={type.icon}
                      size={13}
                      color={isSelected ? '#EF4444' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: isSelected ? '#EF4444' : colors.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bike Info */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Your Bike Information</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FontAwesome6 name="motorcycle" size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={bikeInfo}
                onChangeText={setBikeInfo}
                placeholder="e.g. Honda CB500X • 59-X1 123.45"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Contact Phone */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Emergency Phone Number</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <FontAwesome6 name="phone" size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone for nearby riders to call you"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Auto-Acquired Live GPS Location (Read-Only Preview - No Manual Editing) */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Current Location (Auto-detected GPS)</Text>
            <View
              style={[
                styles.locationPreviewBox,
                { backgroundColor: colors.card, borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : '#FCA5A5' },
              ]}
            >
              <View style={styles.locationPreviewHeader}>
                <View style={styles.liveGpsBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveGpsText}>LIVE GPS LOCKED</Text>
                </View>
                <View style={[styles.lockedPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <FontAwesome6 name="lock" size={9} color="#10B981" />
                  <Text style={styles.lockedPillText}>Auto-detected</Text>
                </View>
              </View>

              {isLocating ? (
                <View style={styles.locatingRow}>
                  <ActivityIndicator size="small" color="#EF4444" />
                  <Text style={[styles.locatingText, { color: colors.textMuted }]}>
                    Detecting current satellite GPS coordinates...
                  </Text>
                </View>
              ) : (
                <View style={styles.locationDetails}>
                  <View style={styles.coordsRow}>
                    <FontAwesome6 name="location-crosshairs" size={13} color="#EF4444" />
                    <Text style={[styles.coordsText, { color: colors.text }]}>
                      {currentLat.toFixed(5)}°N, {currentLng.toFixed(5)}°E
                    </Text>
                  </View>
                  <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={2}>
                    {detectedLocation}
                  </Text>
                </View>
              )}
            </View>

            {/* Additional details */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Notes / Specific Help Needed</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Tire punctured on pass, need a 17-inch tube patch or portable electric pump."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Send Action */}
            <TouchableOpacity
              style={[styles.sendSosBtn, isSending && { opacity: 0.7 }]}
              onPress={handleSendSos}
              disabled={isSending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendSosGradient}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome6 name="bullhorn" size={16} color="#FFFFFF" />
                    <Text style={styles.sendSosBtnText}>SEND SOS TO ALL RIDERS (10KM)</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sendSosBtn: {
    borderRadius: 16,
    marginTop: 22,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendSosGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  sendSosBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  locationPreviewBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  locationPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveGpsText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  locatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  locatingText: {
    fontSize: 11.5,
  },
  locationDetails: {
    gap: 4,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordsText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  addressText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
