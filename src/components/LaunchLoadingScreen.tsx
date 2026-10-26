import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import WaymateIcon from './WaymateIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LaunchLoadingScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export default function LaunchLoadingScreen({
  onFinish,
  duration = 2300,
}: LaunchLoadingScreenProps) {
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();

  const containerFadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation for content inside (background stays 100% solid)
    Animated.parallel([
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Subtle pulse loop on the icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Progress bar fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration - 300,
      useNativeDriver: false,
    }).start();

    // 4. Exit animation: Fade out entire container smoothly after duration
    const exitTimer = setTimeout(() => {
      Animated.timing(containerFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        pulseLoop.stop();
        if (onFinish) onFinish();
      });
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      pulseLoop.stop();
    };
  }, [duration, onFinish, containerFadeAnim, contentFadeAnim, scaleAnim, pulseAnim, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.55],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#080B11' : '#F4F6FA',
          opacity: containerFadeAnim,
        },
      ]}
    >
      {/* Ambient Neon Glow Rings */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            styles.ambientGlow,
            styles.glowCyan,
            { backgroundColor: isDark ? 'rgba(0, 163, 224, 0.22)' : 'rgba(0, 102, 177, 0.15)' },
          ]}
        />
        <View
          style={[
            styles.ambientGlow,
            styles.glowRed,
            { backgroundColor: isDark ? 'rgba(226, 6, 19, 0.18)' : 'rgba(226, 6, 19, 0.12)' },
          ]}
        />
      </View>

      {/* Main Hero Card */}
      <Animated.View
        style={[
          styles.contentCard,
          {
            opacity: contentFadeAnim,
            transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          },
        ]}
      >
        {/* Logo Badge with BMW M-Sport Gradient Border */}
        <LinearGradient
          colors={colors.mGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBadgeBorder}
        >
          <View
            style={[
              styles.logoBadgeInner,
              { backgroundColor: isDark ? '#0E131F' : '#FFFFFF' },
            ]}
          >
            {/* The Custom Drawn WayMate Route Icon */}
            <WaymateIcon
              size={62}
              strokeWidth={7}
              useGradient={true}
              gradientColors={colors.mGradient}
            />
          </View>
        </LinearGradient>

        {/* Brand Name Text: WayMate */}
        <View style={styles.titleRow}>
          <Text style={[styles.titleWay, { color: colors.text }]}>Way</Text>
          <Text style={[styles.titleMate, { color: colors.mBlue }]}>Mate</Text>
        </View>

        {/* App Tagline */}
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          {t('findYourCrew') || 'RIDE TOGETHER • TRACK FURTHER'}
        </Text>
      </Animated.View>

      {/* Loading Progress Indicator */}
      <View style={styles.footer}>
        <View
          style={[
            styles.progressBarTrack,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
            <LinearGradient
              colors={colors.mGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={[styles.loadingLabel, { color: colors.textMuted }]}>
          {language === 'VIE' ? 'Đang khởi động WayMate...' : 'Starting your engines...'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    borderRadius: 200,
  },
  glowCyan: {
    width: 280,
    height: 280,
    top: '25%',
    left: '10%',
  },
  glowRed: {
    width: 250,
    height: 250,
    bottom: '25%',
    right: '10%',
  },
  contentCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBadgeBorder: {
    width: 92,
    height: 92,
    padding: 3,
    borderRadius: 26,
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeInner: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  titleWay: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  titleMate: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  progressBarTrack: {
    width: SCREEN_WIDTH * 0.55,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
