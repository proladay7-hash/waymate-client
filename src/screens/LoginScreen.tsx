import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { signupApi, signinApi, UserDto } from '../services/authApi';
import { promptGoogleLogin } from '../services/googleAuth';
import WaymateIcon from '../components/WaymateIcon';

type TravelStyle = 'Motorcycle' | 'Road Trip' | 'Backpack';
type AuthMode = 'login' | 'signup';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
];

interface LoginScreenProps {
  onLoginSuccess: (user?: UserDto) => void;
  onNavigateToForgot: () => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onNavigateToForgot,
  showToast,
}: LoginScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('proladay7@gmail.com');
  const [loginPassword, setLoginPassword] = useState('023345458');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('Lam Le');
  const [signupEmail, setSignupEmail] = useState('proladay7@gmail.com');
  const [signupPassword, setSignupPassword] = useState('023345458');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('Motorcycle');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);


  const handleLoginSubmit = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast(t('enterEmailPasswordPrompt'), 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await signinApi({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (res.success && res.user) {
        showToast(`${t('welcomeBack')}, ${res.user.name || loginEmail}! 🏍️💨`, 'success');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 500);
      } else {
        showToast(res.message || 'Login failed', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Login error occurred', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      showToast(t('fillAllFieldsPrompt'), 'info');
      return;
    }
    if (signupPassword.length < 6) {
      showToast(t('passwordMinLength'), 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await signupApi({
        name: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        avatar: selectedAvatar,
        bio: `Travel style: ${travelStyle}`,
      });
      if (res.success && res.user) {
        showToast(`${t('accountCreated')}, ${res.user.name}! 🎉`, 'success');
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 500);
      } else {
        showToast(res.message || 'Signup failed', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Signup error occurred', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    if (provider === 'Google') {
      setIsLoading(true);
      try {
        const result = await promptGoogleLogin();
        if (result.success && result.user) {
          showToast(
            `${t('googleLoginSuccess')} (${result.user.name || result.user.email})`,
            'success'
          );
          setTimeout(() => onLoginSuccess(result.user), 400);
        } else if (!result.isCancelled) {
          showToast(result.message || 'Google login failed', 'info');
        }
      } catch (err: any) {
        showToast(err.message || 'Google authentication error', 'info');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    showToast(`${t('connectingVia')} ${provider}... 🚀`, 'info');
  };

  const isLoginEmailValid = loginEmail.includes('@') && loginEmail.length > 5;

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Branding */}
          <View style={styles.header}>
            <LinearGradient
              colors={colors.mGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradientBorder}
            >
              <View style={[styles.logoInner, { backgroundColor: colors.surface }]}>
                <WaymateIcon size={34} strokeWidth={7} color={colors.mBlue} />
              </View>
            </LinearGradient>
            <View style={styles.appNameRow}>
              <Text style={[styles.appName, { color: colors.text }]}>{t('appTitle')}</Text>
            </View>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>{t('findYourCrew')}</Text>
          </View>

          {/* Auth Mode Toggle Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              style={styles.tabTouchable}
              activeOpacity={0.85}
            >
              {authMode === 'login' ? (
                <LinearGradient
                  colors={colors.blueGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabActiveGradient}
                >
                  <AntDesign name="login" size={13} color="#FFFFFF" />
                  <Text style={styles.tabActiveText}>{t('logIn')}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <AntDesign name="login" size={13} color={colors.textMuted} />
                  <Text style={[styles.tabInactiveText, { color: colors.textMuted }]}>{t('logIn')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode('signup')}
              style={styles.tabTouchable}
              activeOpacity={0.85}
            >
              {authMode === 'signup' ? (
                <LinearGradient
                  colors={colors.blueGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabActiveGradient}
                >
                  <AntDesign name="user-add" size={13} color="#FFFFFF" />
                  <Text style={styles.tabActiveText}>{t('signUp')}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <AntDesign name="user-add" size={13} color={colors.textMuted} />
                  <Text style={[styles.tabInactiveText, { color: colors.textMuted }]}>{t('signUp')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ================= LOGIN FORM ================= */}
          {authMode === 'login' && (
            <View style={styles.formContainer}>
              {/* Email / Username */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('emailOrUsername')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    focusedField === 'loginEmail' && { borderColor: colors.mBlue },
                  ]}
                >
                  <AntDesign name="mail" size={15} color={colors.textMuted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="proladay7@gmail.com"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('loginEmail')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {isLoginEmailValid && (
                    <AntDesign name="check-circle" size={15} color={colors.mBlue} />
                  )}
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('password')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    focusedField === 'loginPassword' && { borderColor: colors.mBlue },
                  ]}
                >
                  <AntDesign name="lock" size={16} color={colors.textMuted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.inputPlaceholder}
                    secureTextEntry={!showLoginPassword}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('loginPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AntDesign
                      name={showLoginPassword ? 'eye-invisible' : 'eye'}
                      size={16}
                      color={showLoginPassword ? colors.mBlue : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Keep me signed in */}
              <TouchableOpacity
                style={styles.rememberMeRow}
                activeOpacity={0.8}
                onPress={() => setKeepSignedIn(!keepSignedIn)}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
                    keepSignedIn && { backgroundColor: colors.mBlue, borderColor: colors.mBlue },
                  ]}
                >
                  {keepSignedIn && <AntDesign name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>{t('keepSignedIn')}</Text>
              </TouchableOpacity>

              {/* Primary Submit Button: LOG IN */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleLoginSubmit}
                style={styles.submitButtonTouch}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={colors.mGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingBtnRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>{t('signingIn')}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>{t('logInButton')}</Text>
                      <AntDesign name="arrow-right" size={14} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* FORGOT PASSWORD LINK PLACED RIGHT BELOW THE LOGIN BUTTON */}
              <TouchableOpacity
                style={styles.forgotPasswordBelowBtn}
                activeOpacity={0.75}
                onPress={onNavigateToForgot}
              >
                <AntDesign name="key" size={12} color={colors.mBlue} />
                <Text style={[styles.forgotPasswordBelowText, { color: colors.mBlue }]}>
                  {t('forgotPasswordPrompt')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= SIGN UP FORM ================= */}
          {authMode === 'signup' && (
            <View style={styles.formContainer}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('fullName')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    focusedField === 'signupName' && { borderColor: colors.mBlue },
                  ]}
                >
                  <AntDesign name="user" size={15} color={colors.textMuted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Alex Mercer"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={signupName}
                    onChangeText={setSignupName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('signupName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('emailAddress')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    focusedField === 'signupEmail' && { borderColor: colors.mBlue },
                  ]}
                >
                  <AntDesign name="mail" size={15} color={colors.textMuted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="alex@adventure.com"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('signupEmail')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('createPassword')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    focusedField === 'signupPassword' && { borderColor: colors.mBlue },
                  ]}
                >
                  <AntDesign name="lock" size={16} color={colors.textMuted} style={styles.inputLeftIcon} />
                  <TextInput
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={colors.inputPlaceholder}
                    secureTextEntry={!showSignupPassword}
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('signupPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSignupPassword(!showSignupPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <AntDesign
                      name={showSignupPassword ? 'eye-invisible' : 'eye'}
                      size={16}
                      color={showSignupPassword ? colors.mBlue : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary Travel Style */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('primaryTravelStyle')}</Text>
                <View style={styles.prefRow}>
                  <TouchableOpacity
                    onPress={() => setTravelStyle('Motorcycle')}
                    style={[
                      styles.prefButton,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
                      travelStyle === 'Motorcycle' && { borderColor: colors.mBlue, backgroundColor: colors.badgeBg },
                    ]}
                  >
                    <FontAwesome6
                      name="motorcycle"
                      size={14}
                      color={travelStyle === 'Motorcycle' ? colors.mBlue : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        { color: travelStyle === 'Motorcycle' ? colors.mBlue : colors.textMuted },
                        travelStyle === 'Motorcycle' && { fontWeight: '800' },
                      ]}
                    >
                      {t('motorcycle')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTravelStyle('Road Trip')}
                    style={[
                      styles.prefButton,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
                      travelStyle === 'Road Trip' && { borderColor: colors.mBlue, backgroundColor: colors.badgeBg },
                    ]}
                  >
                    <AntDesign
                      name="car"
                      size={15}
                      color={travelStyle === 'Road Trip' ? colors.mBlue : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        { color: travelStyle === 'Road Trip' ? colors.mBlue : colors.textMuted },
                        travelStyle === 'Road Trip' && { fontWeight: '800' },
                      ]}
                    >
                      {t('roadTrip')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTravelStyle('Backpack')}
                    style={[
                      styles.prefButton,
                      { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
                      travelStyle === 'Backpack' && { borderColor: colors.mBlue, backgroundColor: colors.badgeBg },
                    ]}
                  >
                    <FontAwesome6
                      name="person-hiking"
                      size={14}
                      color={travelStyle === 'Backpack' ? colors.mBlue : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        { color: travelStyle === 'Backpack' ? colors.mBlue : colors.textMuted },
                        travelStyle === 'Backpack' && { fontWeight: '800' },
                      ]}
                    >
                      {t('backpack')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Avatar Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('chooseAvatar')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarPickerRow}
                >
                  {AVATAR_OPTIONS.map((avatarUri, index) => {
                    const isSelected = selectedAvatar === avatarUri;
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedAvatar(avatarUri)}
                        activeOpacity={0.8}
                        style={[
                          styles.avatarOptionWrapper,
                          isSelected && { borderColor: colors.mBlue },
                        ]}
                      >
                        <Image source={{ uri: avatarUri }} style={styles.avatarOptionImg} />
                        {isSelected && (
                          <View style={[styles.avatarOptionCheck, { backgroundColor: colors.mRed }]}>
                            <AntDesign name="check" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Signup Submit Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleSignupSubmit}
                style={styles.submitButtonTouch}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={colors.mGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingBtnRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>{t('creatingAccount')}</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>{t('createWaymateAccount')}</Text>
                      <AntDesign name="check-circle" size={14} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Social Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('orContinueWith')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Social Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => handleSocialAuth('Google')}
              style={[
                styles.socialButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                isLoading && { opacity: 0.6 },
              ]}
              activeOpacity={0.75}
              disabled={isLoading}
            >
              <AntDesign name="google" size={16} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialAuth('Apple')}
              style={[
                styles.socialButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              activeOpacity={0.75}
            >
              <AntDesign name="apple" size={17} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialAuth('Facebook')}
              style={[
                styles.socialButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
              activeOpacity={0.75}
            >
              <FontAwesome6 name="facebook-f" size={15} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Footer Legal */}
          <View style={styles.footerLegal}>
            <Text style={[styles.footerLegalText, { color: colors.textMuted }]}>
              {t('agreeTerms')}{' '}
              <Text
                style={[styles.footerLink, { color: colors.mBlue }]}
                onPress={() => showToast('WayMate Terms of Service', 'info')}
              >
                {t('terms')}
              </Text>{' '}
              &{' '}
              <Text
                style={[styles.footerLink, { color: colors.mBlue }]}
                onPress={() => showToast('WayMate Privacy Policy', 'info')}
              >
                {t('privacy')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoGradientBorder: {
    width: 52,
    height: 52,
    borderRadius: 16,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 13.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  mBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  mBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00A3E0',
  },
  appTagline: {
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 18,
  },
  tabTouchable: {
    flex: 1,
  },
  tabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tabActiveText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabInactiveText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  formContainer: {
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 0,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberMeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  submitButtonTouch: {
    marginTop: 6,
    borderRadius: 12,
    shadowColor: '#00A3E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  forgotPasswordBelowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  forgotPasswordBelowText: {
    fontSize: 12,
    fontWeight: '700',
  },
  prefRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  prefButtonText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLegal: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerLegalText: {
    fontSize: 9.5,
    textAlign: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
  loadingBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  avatarOptionWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarOptionImg: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
  },
  avatarOptionCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
});
