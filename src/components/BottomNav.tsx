import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ScreenId } from './TopBar';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  unreadChatCount?: number;
}

export default function BottomNav({ currentScreen, onNavigate, unreadChatCount = 0 }: BottomNavProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const navItems = [
    { id: 'home' as ScreenId, icon: 'appstore' as const, label: t('navFeed') },
    { id: 'chat' as ScreenId, icon: 'message' as const, label: t('navChat') },
    { id: 'vehicles' as ScreenId, icon: 'car' as const, label: t('navGarage') },
    { id: 'profile' as ScreenId, icon: 'user' as const, label: t('navProfile') },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        const activeColor = colors.mBlue;
        const inactiveColor = colors.textMuted;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => onNavigate(item.id)}
            activeOpacity={0.7}
          >
            {/* Active Indicator Line on top of tab */}
            {isActive && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: activeColor },
                ]}
              />
            )}
            <View style={styles.iconWrap}>
              <AntDesign
                name={item.icon}
                size={18}
                color={isActive ? activeColor : inactiveColor}
              />
              {item.id === 'chat' && unreadChatCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.mRed || '#EF4444' }]}>
                  <Text style={styles.badgeText}>
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.navText,
                { color: isActive ? activeColor : inactiveColor },
                isActive && styles.navTextActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    position: 'relative',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 3,
    minWidth: 0,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -7,
    width: 22,
    height: 3,
    borderRadius: 2,
  },
  navText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  navTextActive: {
    fontWeight: '800',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    height: 22,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    textAlign: 'center',
  },
});
