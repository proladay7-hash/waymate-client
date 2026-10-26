import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL, HELLO_ENDPOINT } from '../config/api';

type HelloResponse = {
  message: string;
  service: string;
};

interface HomepageProps {
  user?: { email: string; name?: string } | null;
  onLogout?: () => void;
}

export default function Homepage({ user, onLogout }: HomepageProps = {}) {
  const [status, setStatus] = useState('Connecting to waymate-service...');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(HELLO_ENDPOINT, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<HelloResponse>;
      })
      .then((data) => {
        setMessage(data.message);
        setStatus(`Connected to ${data.service}`);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Unknown error';
        setStatus(`Could not reach API at ${API_BASE_URL} (${detail})`);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.mark}>WayMate</Text>
      <Text style={styles.subtitle}>Your companion for the road ahead.</Text>
      {user && (
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            Logged in as: <Text style={{ fontWeight: '700' }}>{user.name ?? user.email}</Text>
          </Text>
        </View>
      )}
      {loading ? <ActivityIndicator style={styles.spinner} color="#16382B" /> : null}
      {message ? <Text style={styles.apiMessage}>{message}</Text> : null}
      <Text style={styles.hint}>{status}</Text>
      {onLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign Out & Return to Login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mark: {
    fontSize: 40,
    fontWeight: '700',
    color: '#16382B',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#4A6358',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 28,
  },
  apiMessage: {
    marginTop: 28,
    fontSize: 16,
    color: '#16382B',
    textAlign: 'center',
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    color: '#7A9186',
    textAlign: 'center',
    lineHeight: 20,
  },
  userBadge: {
    marginTop: 18,
    backgroundColor: '#E2EBE5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  userBadgeText: {
    fontSize: 14,
    color: '#16382B',
  },
  logoutButton: {
    marginTop: 28,
    backgroundColor: '#16382B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
