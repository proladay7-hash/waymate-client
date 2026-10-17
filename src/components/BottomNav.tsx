import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ScreenId } from './TopBar';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const navItems = [
    { id: 'home' as ScreenId, icon: 'appstore' as const, label: t('navFeed') },
    { id: 'trip' as ScreenId, icon: 'environment' as const, label: t('navTrips') },
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
            <AntDesign
              name={item.icon}
              size={18}
              color={isActive ? activeColor : inactiveColor}
            />
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
});
