import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useUserLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import WaymateIcon from './WaymateIcon';
import WayMateAgentIcon from './WayMateAgentIcon';

export type ScreenId = 'login' | 'forgot' | 'home' | 'trips' | 'trip' | 'vehicles' | 'profile' | 'changepwd' | 'chat' | 'sosdetail';

interface TopBarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onBack?: () => void;
  isLoggedIn: boolean;
  onLogout?: () => void;
  onOpenChat?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

export default function TopBar({
  currentScreen,
  onBack,
  isLoggedIn,
  onLogout,
  onOpenChat,
  onOpenNotifications,
  unreadNotificationCount = 0,
  showToast,
}: TopBarProps) {
  const { language, setLanguage, unit, toggleUnit, t } = useLanguage();
  const { permissionStatus, requestLocationPermission } = useUserLocation();
  const { colors, isDark, toggleTheme } = useTheme();

  const isSubScreen =
    currentScreen === 'trip' ||
    currentScreen === 'forgot' ||
    currentScreen === 'changepwd' ||
    currentScreen === 'sosdetail';

  const getSubScreenTitle = () => {
    switch (currentScreen) {
      case 'trip':
        return t('navTripView');
      case 'forgot':
        return t('navForgotPwd');
      case 'changepwd':
        return t('navChangePwd');
      case 'sosdetail':
        return '🚨 SOS Roadside Assistance';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.topRow}>
        {/* Left: Back button if sub-screen, else Brand Logo & Title */}
        {isSubScreen ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <AntDesign name="arrow-left" size={17} color={colors.text} />
            <Text style={[styles.subScreenTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
              {getSubScreenTitle()}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandContainer}>
            <LinearGradient
              colors={colors.mGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <WaymateIcon size={19} color="#FFFFFF" strokeWidth={7} />
            </LinearGradient>
            <View style={styles.brandTextWrapper}>
              <Text style={[styles.brandTitle, { color: colors.text }]} numberOfLines={1}>
                {t('appTitle')}
              </Text>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                {t('appSubtitle')}
              </Text>
            </View>
          </View>
        )}

        {/* Right side controls: AI Agent, Theme switch, GPS Status, Language switcher, Unit toggle, optional Logout */}
        <View style={styles.actionsRow}>
          {/* AI Agent Quick Open Button (only when logged in) */}
          {isLoggedIn && onOpenChat && (
            <TouchableOpacity
              style={[
                styles.aiChatTopBtn,
                {
                  backgroundColor: 'rgba(0, 163, 224, 0.15)',
                  borderColor: isDark ? 'rgba(0, 163, 224, 0.45)' : 'rgba(0, 102, 177, 0.35)',
                },
              ]}
              onPress={onOpenChat}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <WayMateAgentIcon size={16} showAccents={false} />
            </TouchableOpacity>
          )}

          {/* Notifications Bell Button (only when logged in) */}
          {isLoggedIn && onOpenNotifications && (
            <TouchableOpacity
              style={[
                styles.notifTopBtn,
                {
                  backgroundColor: isDark ? 'rgba(0, 82, 255, 0.15)' : 'rgba(0, 82, 255, 0.1)',
                  borderColor: isDark ? 'rgba(0, 82, 255, 0.45)' : 'rgba(0, 82, 255, 0.35)',
                },
              ]}
              onPress={onOpenNotifications}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <FontAwesome6 name="bell" size={11} color={colors.mBlue} />
              {unreadNotificationCount > 0 && (
                <View style={[styles.topNotifBadge, { backgroundColor: colors.mRed }]}>
                  <Text style={styles.topNotifBadgeText}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Dark / Light Theme Toggle Button */}
          <TouchableOpacity
            style={[
              styles.themeBtn,
              {
                backgroundColor: isDark ? 'rgba(0, 163, 224, 0.15)' : 'rgba(0, 102, 177, 0.12)',
                borderColor: isDark ? 'rgba(0, 163, 224, 0.4)' : 'rgba(0, 102, 177, 0.35)',
              },
            ]}
            onPress={() => {
              toggleTheme();
              if (showToast) {
                showToast(
                  `${t('themeSwitched')} ${!isDark ? t('themeDark') : t('themeLight')} 🏁`,
                  'info'
                );
              }
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <AntDesign
              name={isDark ? 'moon' : 'sun'}
              size={12}
              color={isDark ? '#00A3E0' : '#E20613'}
            />
          </TouchableOpacity>

          {/* GPS Location Button */}
          <TouchableOpacity
            style={[
              styles.gpsBtn,
              permissionStatus === 'granted'
                ? { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)' }
                : { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.35)' },
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
                { color: permissionStatus === 'granted' ? '#10B981' : '#F59E0B' },
              ]}
            >
              {permissionStatus === 'granted' ? 'GPS' : 'GPS?'}
            </Text>
          </TouchableOpacity>

          {/* Compact Single Language Toggle [ 🌐 {language} ] */}
          <TouchableOpacity
            style={[styles.langToggleBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
            onPress={() => setLanguage(language === 'ENG' ? 'VIE' : 'ENG')}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={styles.langToggleIcon}>🌐</Text>
            <Text style={[styles.langToggleText, { color: colors.text }]}>{language}</Text>
          </TouchableOpacity>

          {/* Compact Unit Switcher (KM / MI) - ONLY when logged in */}
          {isLoggedIn && (
            <TouchableOpacity
              style={[styles.unitBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
              onPress={toggleUnit}
              activeOpacity={0.8}
            >
              <AntDesign name="dashboard" size={10} color={colors.mBlue} />
              <Text style={[styles.unitBtnText, { color: colors.text }]}>
                {unit === 'KM' ? 'KM' : 'MI'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Logout button (visible in Profile screen when logged in) */}
          {isLoggedIn && currentScreen === 'profile' && onLogout && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <AntDesign name="logout" size={11} color="#E20613" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
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
    fontSize: 13,
    fontWeight: '800',
  },
  brandContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
    marginRight: 4,
  },
  logoBadge: {
    width: 27,
    height: 27,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 3,
  },
  brandTextWrapper: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  brandSubtitle: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  aiChatTopBtn: {
    width: 25,
    height: 25,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifTopBtn: {
    width: 25,
    height: 25,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  topNotifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  topNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
  },
  themeBtn: {
    width: 25,
    height: 25,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    paddingHorizontal: 5,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  gpsBtnText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  langToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 3.5,
  },
  langToggleIcon: {
    fontSize: 9,
  },
  langToggleText: {
    fontSize: 9,
    fontWeight: '800',
  },
  unitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 3.5,
  },
  unitBtnText: {
    fontSize: 9,
    fontWeight: '700',
  },
  logoutBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(226, 6, 19, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 6, 19, 0.3)',
  },
});
