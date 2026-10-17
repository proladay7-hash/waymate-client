import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useLanguage } from '../context/LanguageContext';
import { ScreenId } from './TopBar';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* Feed Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('home')}
        activeOpacity={0.7}
      >
        <AntDesign
          name="appstore"
          size={18}
          color={currentScreen === 'home' ? '#FF5E1A' : '#94A3B8'}
        />
        <Text
          style={[styles.navText, currentScreen === 'home' && styles.navTextActive]}
          numberOfLines={1}
        >
          {t('navFeed')}
        </Text>
      </TouchableOpacity>

      {/* Trips Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('trip')}
        activeOpacity={0.7}
      >
        <AntDesign
          name="environment"
          size={18}
          color={currentScreen === 'trip' ? '#FF5E1A' : '#94A3B8'}
        />
        <Text
          style={[styles.navText, currentScreen === 'trip' && styles.navTextActive]}
          numberOfLines={1}
        >
          {t('navTrips')}
        </Text>
      </TouchableOpacity>

      {/* My Vehicles Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('vehicles')}
        activeOpacity={0.7}
      >
        <AntDesign
          name="car"
          size={18}
          color={currentScreen === 'vehicles' ? '#FF5E1A' : '#94A3B8'}
        />
        <Text
          style={[styles.navText, currentScreen === 'vehicles' && styles.navTextActive]}
          numberOfLines={1}
        >
          {t('navGarage')}
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onNavigate('profile')}
        activeOpacity={0.7}
      >
        <AntDesign
          name="user"
          size={18}
          color={currentScreen === 'profile' ? '#FF5E1A' : '#94A3B8'}
        />
        <Text
          style={[styles.navText, currentScreen === 'profile' && styles.navTextActive]}
          numberOfLines={1}
        >
          {t('navProfile')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0F19',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
    minWidth: 0,
  },
  navText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  navTextActive: {
    color: '#FF5E1A',
  },
});
