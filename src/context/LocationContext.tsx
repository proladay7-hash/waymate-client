import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';

export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'requesting';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  address?: string;
}

interface LocationContextType {
  permissionStatus: LocationPermissionStatus;
  userLocation: UserCoordinates | null;
  isLoadingLocation: boolean;
  requestLocationPermission: (showRationalePrompt?: boolean) => Promise<boolean>;
  openDeviceSettings: () => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);

  const openDeviceSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const fetchCoordinates = useCallback(async () => {
    try {
      setIsLoadingLocation(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let cityName = 'Vietnam';
      let regionName = 'Rider Hub';

      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          cityName = place.city || place.subregion || place.district || 'Hồ Chí Minh City';
          regionName = place.region || place.country || 'Vietnam';
        }
      } catch {
        cityName = `${position.coords.latitude.toFixed(3)}°N, ${position.coords.longitude.toFixed(3)}°E`;
      }

      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: cityName,
        region: regionName,
      });
    } catch {
      setUserLocation({
        latitude: 10.7769,
        longitude: 106.7009,
        city: 'TP. Hồ Chí Minh',
        region: 'Việt Nam',
      });
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const requestLocationPermission = useCallback(
    async (showRationalePrompt = true): Promise<boolean> => {
      setPermissionStatus('requesting');
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

        if (status === Location.PermissionStatus.GRANTED) {
          setPermissionStatus('granted');
          await fetchCoordinates();
          return true;
        } else {
          setPermissionStatus('denied');
          if (showRationalePrompt && !canAskAgain && Platform.OS !== 'web') {
            Alert.alert(
              'Location Access Required',
              'Waymate uses GPS to detect nearby riders and record trip telemetry. Please enable Location in your device settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: openDeviceSettings },
              ]
            );
          }
          return false;
        }
      } catch {
        setPermissionStatus('denied');
        return false;
      }
    },
    [fetchCoordinates, openDeviceSettings]
  );

  const refreshLocation = useCallback(async () => {
    if (permissionStatus === 'granted') {
      await fetchCoordinates();
    } else {
      await requestLocationPermission(false);
    }
  }, [permissionStatus, fetchCoordinates, requestLocationPermission]);

  // Initial check on mount
  useEffect(() => {
    let isMounted = true;

    async function checkPermission() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!isMounted) return;

        if (status === Location.PermissionStatus.GRANTED) {
          setPermissionStatus('granted');
          await fetchCoordinates();
        } else if (status === Location.PermissionStatus.DENIED) {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('undetermined');
        }
      } catch {
        if (isMounted) setPermissionStatus('undetermined');
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [fetchCoordinates]);

  return (
    <LocationContext.Provider
      value={{
        permissionStatus,
        userLocation,
        isLoadingLocation,
        requestLocationPermission,
        openDeviceSettings,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
}
