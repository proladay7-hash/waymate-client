import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  sendChatMessage,
  checkAiAgentHealth,
  ChatMessageItem,
  ChatSource,
  getOrCreateSessionId,
  resetSessionId,
} from '../services/aiAgentApi';
import WaymateIcon from './WaymateIcon';
import WayMateAgentIcon from './WayMateAgentIcon';

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  showToast?: (message: string, type?: 'success' | 'info') => void;
}

export function AIChatButton({ onPress }: { onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.fabTouchable}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={colors.mGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <View style={styles.fabInnerGlow}>
            <WayMateAgentIcon size={24} color="#FFFFFF" showAccents={false} />
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AIChatModal({ visible, onClose, showToast }: AIChatModalProps) {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAgentHealthy, setIsAgentHealthy] = useState<boolean | null>(null);

  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const typingDotAnim = useRef(new Animated.Value(0)).current;

  // Check health of AI Agent on mount / open
  useEffect(() => {
    if (visible) {
      checkAiAgentHealth().then((health) => {
        setIsAgentHealthy(health !== null);
      });
    }
  }, [visible]);

  // Typing dots animation
  useEffect(() => {
    if (isTyping) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(typingDotAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingDotAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isTyping, typingDotAnim]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping, visible]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessageItem = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    try {
      const res = await sendChatMessage(query, getOrCreateSessionId(), 'rider_app', language);
      const assistantMsg: ChatMessageItem = {
        id: 'msg_ai_' + Date.now(),
        sender: 'assistant',
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessageItem = {
        id: 'msg_err_' + Date.now(),
        sender: 'assistant',
        text: language === 'VIE'
          ? 'Trợ lý WayMate AI hiện không khả dụng. Vui lòng đảm bảo Ollama đang hoạt động với mô hình qwen2.5:0.5b.'
          : 'WayMate AI Agent is currently not available. Please ensure Ollama is running with model qwen2.5:0.5b.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    resetSessionId();
    setMessages([]);
    if (showToast) {
      showToast(language === 'VIE' ? 'Đã xoá lịch sử chat' : 'Conversation cleared', 'info');
    }
  };

  const quickPrompts = [
    { id: 'hagiang', label: t('quickPromptHaGiang'), query: language === 'VIE' ? 'Hãy tư vấn cho tôi cung đường phượt Vòng cung Hà Giang' : 'Tell me all about the Ha Giang Extreme Northern Loop trip' },
    { id: 'oil', label: t('quickPromptOil'), query: language === 'VIE' ? 'Khi nào tôi nên thay nhớt cho xe máy và xe hơi trên WayMate?' : 'When should I change engine oil for motorcycle and car in WayMate?' },
    { id: 'dalat', label: t('quickPromptDaLat'), query: language === 'VIE' ? 'Cung phượt Sài Gòn đi Đà Lạt có những điểm dừng nào?' : 'What are the landmarks and pit stops for Saigon to Da Lat ride?' },
    { id: 'maps', label: t('quickPromptMaps'), query: language === 'VIE' ? 'Làm thế nào để xem lộ trình trên Google Maps và ghim toạ độ GPS?' : 'How do I preview routes on Google Maps and pin GPS coordinates?' },
    { id: 'password', label: t('quickPromptPassword'), query: language === 'VIE' ? 'Quy trình lấy lại mật khẩu qua mã OTP như thế nào?' : 'How does the 3-step OTP password reset work?' },
    { id: 'gear', label: t('quickPromptGear'), query: language === 'VIE' ? 'Trang bị an toàn và bảo hộ phượt nào được khuyến nghị?' : 'What safety gear is recommended for motorcycle touring?' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? 'rgba(13, 17, 23, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={colors.mGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <WayMateAgentIcon size={24} color="#FFFFFF" showAccents={false} />
              </LinearGradient>
              <View>
                <View style={styles.titleRow}>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('aiAgentTitle')}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isAgentHealthy
                          ? 'rgba(46, 213, 115, 0.15)'
                          : 'rgba(0, 163, 224, 0.15)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDotSmall,
                        {
                          backgroundColor: isAgentHealthy ? '#2ED573' : colors.mBlue,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isAgentHealthy ? '#2ED573' : colors.mBlue,
                        },
                      ]}
                    >
                      {isAgentHealthy ? t('aiStatusOnline') : t('aiStatusLocal')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {t('aiAgentSubtitle')}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {messages.length > 0 && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleClearHistory}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AntDesign name="delete" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="close" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Welcome Banner if empty */}
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <LinearGradient
                  colors={colors.mGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.welcomeIconRing}
                >
                  <FontAwesome6 name="motorcycle" size={26} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                  {t('agentWelcomeTitle')}
                </Text>
                <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
                  {t('agentWelcomeDesc')}
                </Text>

                {/* Suggested Questions Grid */}
                <View style={styles.suggestionsContainer}>
                  {quickPrompts.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.suggestionCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleSend(item.query)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.suggestionText, { color: colors.text }]}>
                        {item.label}
                      </Text>
                      <AntDesign name="arrow-right" size={12} color={colors.mBlue} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Render Chat Messages */}
            {messages.map((item) => {
              const isUser = item.sender === 'user';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {!isUser && (
                    <LinearGradient
                      colors={colors.mGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bubbleAvatar}
                    >
                      <WayMateAgentIcon size={17} color="#FFFFFF" showAccents={false} />
                    </LinearGradient>
                  )}

                  <View
                    style={[
                      styles.bubbleContainer,
                      isUser
                        ? [styles.bubbleUser, { backgroundColor: colors.mBlue }]
                        : [
                            styles.bubbleAssistant,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ],
                      item.isError && { borderColor: colors.mRed, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: isUser ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {item.text}
                    </Text>

                    {/* Sources Badge List */}
                    {item.sources && item.sources.length > 0 && (
                      <View style={styles.sourcesWrapper}>
                        <Text style={[styles.sourcesHeader, { color: colors.textMuted }]}>
                          {t('sourcesTitle')}:
                        </Text>
                        <View style={styles.sourcesChipsRow}>
                          {item.sources.map((src, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.sourceChip,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(0, 163, 224, 0.12)'
                                    : 'rgba(0, 102, 177, 0.08)',
                                  borderColor: isDark
                                    ? 'rgba(0, 163, 224, 0.3)'
                                    : 'rgba(0, 102, 177, 0.25)',
                                },
                              ]}
                            >
                              <AntDesign name="link" size={10} color={colors.mBlue} />
                              <Text
                                style={[styles.sourceChipText, { color: colors.mBlue }]}
                                numberOfLines={1}
                              >
                                {src.title}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.timestampText,
                        { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted },
                      ]}
                    >
                      {item.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <View style={styles.typingRow}>
                <Animated.View
                  style={[
                    styles.typingDot,
                    {
                      backgroundColor: colors.mBlue,
                      opacity: typingDotAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.35, 1],
                      }),
                    },
                  ]}
                />
                <Text style={[styles.typingText, { color: colors.textMuted }]}>
                  {t('typing')}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Prompts Horizontal Scroll (When messages exist and not typing) */}
          {messages.length > 0 && !isTyping && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickPromptScrollView}
              contentContainerStyle={styles.quickPromptScroll}
            >
              {quickPrompts.slice(0, 4).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.quickPromptChip,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSend(p.query)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickPromptChipText, { color: colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input Bar */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: colors.border,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('askAiPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? colors.mBlue : 'rgba(128,128,128,0.2)',
                },
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.8}
            >
              <AntDesign
                name="arrow-up"
                size={18}
                color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // FAB Floating Action Button
  fabContainer: {
    position: 'absolute',
    bottom: 68,
    right: 18,
    zIndex: 999,
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabTouchable: {
    borderRadius: 28,
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInnerGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(0, 16, 32, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ED573',
  },

  // Modal Container
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '84%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message scroll area
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  // Welcome state
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  welcomeIconRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  suggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },

  // Chat bubbles
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 2,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubbleContainer: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 9,
    marginTop: 5,
    alignSelf: 'flex-end',
  },

  // Sources
  sourcesWrapper: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  sourcesHeader: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: '100%',
  },
  sourceChipText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Quick prompt chips above input
  quickPromptScrollView: {
    flexGrow: 0,
    height: 44,
    maxHeight: 44,
  },
  quickPromptScroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  quickPromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
  },
  quickPromptChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Input Bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
