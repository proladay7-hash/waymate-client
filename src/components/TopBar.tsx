import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';

export type ScreenId = 'login' | 'forgot' | 'home' | 'trip' | 'vehicles' | 'profile' | 'changepwd';

interface TopBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onBack?: () => void;
  isLoggedIn: boolean;
  onLogout?: () => void;
}

export default function TopBar({
  currentScreen,
  onBack,
  isLoggedIn,
  onLogout,
}: TopBarProps) {
  const { language, setLanguage, unit, toggleUnit, t } = useLanguage();
  const { permissionStatus, requestLocationPermission } = useUserLocation();

  const isSubScreen = currentScreen === 'trip' || currentScreen === 'forgot' || currentScreen === 'changepwd';

  const getSubScreenTitle = () => {
    switch (currentScreen) {
      case 'trip':
        return t('navTripView');
      case 'forgot':
        return t('navForgotPwd');
      case 'changepwd':
        return t('navChangePwd');
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Left: Back button if sub-screen, else Brand Logo & Title */}
        {isSubScreen ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <AntDesign name="arrow-left" size={17} color="#FFFFFF" />
            <Text style={styles.subScreenTitle} numberOfLines={1} ellipsizeMode="tail">
              {getSubScreenTitle()}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={['#FF5E1A', '#FF9F1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <FontAwesome6 name="route" size={13} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.brandTextWrapper}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                {t('appTitle')}
              </Text>
              <Text style={styles.brandSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {t('appSubtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Right side controls: GPS Status, Language switcher, Unit toggle, optional Logout */}
        <View style={styles.actionsRow}>
          {/* GPS Location Button */}
          <TouchableOpacity
            style={[
              styles.gpsBtn,
              permissionStatus === 'granted' ? styles.gpsBtnActive : styles.gpsBtnOff,
            ]}
            onPress={() => requestLocationPermission()}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <AntDesign
              name="environment"
              size={11}
              color={permissionStatus === 'granted' ? '#10B981' : '#F59E0B'}
            />
            <Text
              style={[
                styles.gpsBtnText,
                permissionStatus === 'granted' ? styles.gpsBtnTextActive : styles.gpsBtnTextOff,
              ]}
            >
              {permissionStatus === 'granted' ? 'GPS' : 'GPS?'}
            </Text>
          </TouchableOpacity>

          {/* Language Switcher Pill [ ENG | VIE ] */}
          <View style={styles.langPillContainer}>
            <TouchableOpacity
              onPress={() => setLanguage('ENG')}
              style={[styles.langBtn, language === 'ENG' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, language === 'ENG' && styles.langBtnTextActive]}>
                ENG
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLanguage('VIE')}
              style={[styles.langBtn, language === 'VIE' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, language === 'VIE' && styles.langBtnTextActive]}>
                VIE
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compact Unit Switcher (KM / MI) */}
          <TouchableOpacity
            style={styles.unitBtn}
            onPress={toggleUnit}
            activeOpacity={0.8}
          >
            <AntDesign name="dashboard" size={10} color="#FF5E1A" />
            <Text style={styles.unitBtnText}>
              {unit === 'KM' ? 'KM' : 'MI'}
            </Text>
          </TouchableOpacity>

          {/* Logout button (visible in Profile screen when logged in) */}
          {isLoggedIn && currentScreen === 'profile' && onLogout && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <AntDesign name="logout" size={11} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B0F19',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 50,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
    minWidth: 0,
    marginRight: 6,
  },
  subScreenTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginRight: 6,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  brandTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  gpsBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  gpsBtnOff: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  gpsBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  gpsBtnTextActive: {
    color: '#10B981',
  },
  gpsBtnTextOff: {
    color: '#F59E0B',
  },
  langPillContainer: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#FF5E1A',
  },
  langBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  unitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  unitBtnText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  logoutBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
});
