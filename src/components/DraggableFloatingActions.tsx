import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '../context/ThemeContext';
import WayMateAgentIcon from './WayMateAgentIcon';

interface DraggableFloatingActionsProps {
  onPressChat: () => void;
  onPressSos: () => void;
  unreadChatCount?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DraggableFloatingActions({
  onPressChat,
  onPressSos,
  unreadChatCount = 0,
}: DraggableFloatingActionsProps) {
  const { colors, isDark } = useTheme();

  // Expanded / Collapsed state (default expanded so user sees options immediately)
  const [isExpanded, setIsExpanded] = useState(true);

  // Position XY for dragging anywhere on screen
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Spring animation for expand/collapse (0 = collapsed, 1 = expanded)
  const expandAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for SOS when expanded
  const sosPulseAnim = useRef(new Animated.Value(1)).current;

  // Track dragging vs tapping
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulseAnim, {
          toValue: 1.07,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(sosPulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [sosPulseAnim]);

  // Toggle expand / collapse with smooth spring physics
  const toggleExpanded = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    Animated.spring(expandAnim, {
      toValue: nextState ? 1 : 0,
      friction: 6.5,
      tension: 65,
      useNativeDriver: true,
    }).start();
  };

  // PanResponder to allow dragging anywhere on the screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only initiate drag if user actually moves finger more than 6px
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 120);
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        isDraggingRef.current = false;
      },
    })
  ).current;

  // Interpolations for upward expansion
  // SOS button: moves upward by -118px
  const sosTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, -118],
  });
  const sosScale = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.05, 0.5, 1],
  });
  const sosOpacity = expandAnim.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.5, 1],
  });

  // AI Chat button: moves upward by -58px
  const chatTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -58],
  });
  const chatScale = expandAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.05, 0.6, 1],
  });
  const chatOpacity = expandAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.5, 1],
  });

  // Toggle button icon rotation (0 to 180 deg)
  const triggerRotation = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.masterContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {/* 1. SOS Emergency Button (Top of upward stack) */}
      <Animated.View
        style={[
          styles.actionItem,
          {
            opacity: sosOpacity,
            transform: [
              { translateY: sosTranslateY },
              { scale: Animated.multiply(sosScale, sosPulseAnim) },
            ],
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={() => {
            if (!isDraggingRef.current) onPressSos();
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF3B30', '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sosGradient}
          >
            <View style={styles.sosInnerGlow}>
              <FontAwesome6 name="triangle-exclamation" size={17} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* 2. WayMate AI Agent Chat Button (Middle of upward stack) */}
      <Animated.View
        style={[
          styles.actionItem,
          {
            opacity: chatOpacity,
            transform: [{ translateY: chatTranslateY }, { scale: chatScale }],
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={() => {
            if (!isDraggingRef.current) onPressChat();
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={colors.mGradient || ['#0052FF', '#00C6FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chatGradient}
          >
            <View style={styles.chatInnerGlow}>
              <WayMateAgentIcon size={24} color="#FFFFFF" showAccents={false} />
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* 3. Collapse / Expand Control FAB Trigger (Bottom anchor) */}
      <TouchableOpacity
        style={styles.triggerTouchable}
        onPress={() => {
          if (!isDraggingRef.current) toggleExpanded();
        }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={
            isExpanded
              ? isDark
                ? ['#1E293B', '#0F172A']
                : ['#334155', '#1E293B']
              : ['#0052FF', '#2563EB']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.triggerGradient}
        >
          <Animated.View
            style={[
              styles.triggerIconWrap,
              {
                transform: [{ rotate: triggerRotation }],
              },
            ]}
          >
            <AntDesign
              name={isExpanded ? 'down' : 'up'}
              size={18}
              color="#FFFFFF"
            />
          </Animated.View>

          {/* Unread indicator badge when collapsed */}
          {!isExpanded && unreadChatCount > 0 && (
            <View style={styles.unreadTriggerDot} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  masterContainer: {
    position: 'absolute',
    bottom: 74,
    right: 18,
    width: 60,
    height: 185,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 9999,
  },
  actionItem: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  touchable: {
    borderRadius: 26,
  },
  sosGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosInnerGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: 'rgba(170, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  chatGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInnerGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
  },
  triggerTouchable: {
    borderRadius: 26,
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 9,
  },
  triggerGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  triggerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadTriggerDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
