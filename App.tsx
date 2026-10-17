import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import TopBar, { ScreenId } from './src/components/TopBar';
import BottomNav from './src/components/BottomNav';
import HomeScreen from './src/screens/HomeScreen';
import TripDetailScreen from './src/screens/TripDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import VehiclesScreen from './src/screens/VehiclesScreen';
import { initialVehicles, Vehicle } from './src/data/mockVehicles';
import { mockTripsData, TripData } from './src/data/mockTrips';
import { UserDto, setAuthToken } from './src/services/authApi';

export type ToastType = 'success' | 'info' | 'error';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

function MainApp() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors, isDark, toggleTheme } = useTheme();

  // Authentication State: DEFAULT FIRST COME IN IS LOGIN PAGE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('login');

  // Vehicles & Maintenance Tracker State
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);

  // Trips Feed & Google Maps Destinations State
  const [trips, setTrips] = useState<TripData[]>(mockTripsData);

  // Selected Trip & Saved favorites
  const [selectedTripId, setSelectedTripId] = useState<string>('trip-1');
  const [savedTripIds, setSavedTripIds] = useState<string[]>(['trip-1']);

  // Global Animated Toast Banner
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [toastAnim] = useState(() => new Animated.Value(0));
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: true, message, type });
    Animated.spring(toastAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();

    toastTimerRef.current = setTimeout(() => {
      hideToast();
    }, 3200);
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  // Auth flow callbacks
  const handleLoginSuccess = (user?: UserDto) => {
    if (user) {
      setCurrentUser(user);
    }
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentScreen('login');
    showToast('Logged out successfully', 'info');
  };

  // Vehicle management
  const handleAddVehicle = (newVeh: Vehicle) => {
    setVehicles((prev) => [newVeh, ...prev]);
  };

  const handleUpdateVehicle = (updatedVeh: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v))
    );
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
  };

  // Toggle favorite saved trip
  const handleToggleSaveTrip = (tripId: string) => {
    if (savedTripIds.includes(tripId)) {
      setSavedTripIds((prev) => prev.filter((id) => id !== tripId));
      showToast(t('removedFavorite'), 'info');
    } else {
      setSavedTripIds((prev) => [...prev, tripId]);
      showToast(t('savedFavorite'), 'success');
    }
  };

  // Trips management & Add New Trip
  const handleAddTrip = (newTrip: TripData) => {
    setTrips((prev) => [newTrip, ...prev]);
    showToast(t('tripPostedSuccess'), 'success');
  };

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setCurrentScreen('trip');
  };

  // Back handler based on current active screen
  const handleBack = () => {
    if (currentScreen === 'trip') {
      setCurrentScreen('home');
    } else if (currentScreen === 'forgot') {
      setCurrentScreen('login');
    } else if (currentScreen === 'changepwd') {
      setCurrentScreen('profile');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* BMW S1000RR Ambient Glow Background Effects */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.ambientGlow, styles.glowBlue, { backgroundColor: colors.ambientGlowBlue }]} />
        <View style={[styles.ambientGlow, styles.glowRed, { backgroundColor: colors.ambientGlowRed }]} />
        <View style={[styles.ambientGlow, styles.glowNavy, { backgroundColor: colors.ambientGlowNavy }]} />
      </View>

      {/* Header Bar */}
      <TopBar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onBack={handleBack}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        showToast={showToast}
      />

      {/* Screen Body - Exactly 1 page visible at a time */}
      <View style={styles.bodyContainer}>
        {/* Unauthenticated / Auth Screens */}
        {!isLoggedIn && currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onNavigateToForgot={() => setCurrentScreen('forgot')}
            showToast={showToast}
          />
        )}

        {currentScreen === 'forgot' && (
          <ForgotPasswordScreen
            onBackToLogin={() => setCurrentScreen('login')}
            showToast={showToast}
          />
        )}

        {/* Authenticated Screens */}
        {isLoggedIn && currentScreen === 'home' && (
          <HomeScreen
            trips={trips}
            onAddTrip={handleAddTrip}
            onSelectTrip={handleSelectTrip}
            savedTripIds={savedTripIds}
            onToggleSaveTrip={handleToggleSaveTrip}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'trip' && (
          <TripDetailScreen
            tripId={selectedTripId}
            trips={trips}
            onBack={() => setCurrentScreen('home')}
            savedTripIds={savedTripIds}
            onToggleSaveTrip={handleToggleSaveTrip}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'vehicles' && (
          <VehiclesScreen
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'profile' && (
          <ProfileScreen
            currentUser={currentUser}
            trips={trips}
            onNavigateToTrip={handleSelectTrip}
            onNavigateToVehicles={() => setCurrentScreen('vehicles')}
            onNavigateToChangePwd={() => setCurrentScreen('changepwd')}
            onLogout={handleLogout}
            savedTripIds={savedTripIds}
            vehicles={vehicles}
            showToast={showToast}
          />
        )}

        {isLoggedIn && currentScreen === 'changepwd' && (
          <ChangePasswordScreen
            userEmail={currentUser?.email}
            onBack={() => setCurrentScreen('profile')}
            showToast={showToast}
          />
        )}
      </View>

      {/* Persistent Bottom App Navigation Bar (Shown when user is logged in) */}
      {isLoggedIn && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}

      {/* Floating Animated Toast Banner */}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: Math.max(insets.top, 20) + 55,
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.toastBubble,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: toast.type === 'success' ? colors.mBlue : colors.mRed,
              },
            ]}
          >
            <AntDesign
              name={toast.type === 'success' ? 'check-circle' : 'info-circle'}
              size={15}
              color={toast.type === 'success' ? colors.mBlue : colors.mRed}
            />
            <Text style={[styles.toastMessage, { color: colors.text }]} numberOfLines={2}>
              {toast.message}
            </Text>
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AntDesign name="close" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <LocationProvider>
            <MainApp />
          </LocationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bodyContainer: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    borderRadius: 220,
  },
  glowBlue: {
    width: 320,
    height: 320,
    top: -100,
    left: -100,
  },
  glowRed: {
    width: 290,
    height: 290,
    top: '38%',
    right: -100,
  },
  glowNavy: {
    width: 330,
    height: 330,
    bottom: -110,
    left: '15%',
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: 420,
    width: '100%',
  },
  toastMessage: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
