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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { signupApi, signinApi, UserDto } from '../services/authApi';
import { promptGoogleLogin, signInWithGoogleAccount } from '../services/googleAuth';

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

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('rider_alex@waymate.app');
  const [loginPassword, setLoginPassword] = useState('Adventure2026!');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('Alex Rider');
  const [signupEmail, setSignupEmail] = useState('alex.rider@waymate.app');
  const [signupPassword, setSignupPassword] = useState('RoadTrip2026!');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('Motorcycle');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Google Sign-In Modal & Custom Account State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [isCustomGoogleMode, setIsCustomGoogleMode] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  const handleGoogleAccountSelect = async (
    email: string,
    name?: string,
    avatar?: string
  ) => {
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogleAccount(email, name, avatar);
      if (result.success && result.user) {
        setShowGoogleModal(false);
        showToast(
          `${t('googleLoginSuccess')} (${result.user.name || result.user.email})`,
          'success'
        );
        setTimeout(() => {
          onLoginSuccess(result.user);
        }, 400);
      } else {
        showToast(result.message || 'Google login failed', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Google authentication error', 'info');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleBrowserOAuth = async () => {
    setIsGoogleSubmitting(true);
    try {
      const result = await promptGoogleLogin();
      if (result.success && result.user) {
        setShowGoogleModal(false);
        showToast(`${t('googleLoginSuccess')} (${result.user.name})`, 'success');
        setTimeout(() => {
          onLoginSuccess(result.user);
        }, 400);
      } else if (result.isPolicyBlocked) {
        showToast(
          result.message || 'Google blocks exp:// scheme. Please select account below.',
          'info'
        );
      } else {
        showToast(result.message || 'Google login cancelled', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Google OAuth error occurred', 'info');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSocialAuth = async (provider: string) => {
    if (provider === 'Google') {
      setShowGoogleModal(true);
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
        <View style={styles.cardContainer}>
          {/* Header Branding */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#FF5E1A', '#FF9F1C', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradientBorder}
            >
              <View style={styles.logoInner}>
                <FontAwesome6 name="route" size={24} color="#FF5E1A" />
              </View>
            </LinearGradient>
            <Text style={styles.appName}>{t('appTitle')}</Text>
            <Text style={styles.appTagline}>{t('findYourCrew')}</Text>
          </View>

          {/* Auth Mode Toggle Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              style={styles.tabTouchable}
              activeOpacity={0.85}
            >
              {authMode === 'login' ? (
                <LinearGradient
                  colors={['#FF5E1A', '#E63946']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabActiveGradient}
                >
                  <AntDesign name="login" size={13} color="#FFFFFF" />
                  <Text style={styles.tabActiveText}>{t('logIn')}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <AntDesign name="login" size={13} color="#94A3B8" />
                  <Text style={styles.tabInactiveText}>{t('logIn')}</Text>
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
                  colors={['#FF5E1A', '#E63946']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabActiveGradient}
                >
                  <AntDesign name="user-add" size={13} color="#FFFFFF" />
                  <Text style={styles.tabActiveText}>{t('signUp')}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInactive}>
                  <AntDesign name="user-add" size={13} color="#94A3B8" />
                  <Text style={styles.tabInactiveText}>{t('signUp')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ================= LOGIN FORM ================= */}
          {authMode === 'login' && (
            <View style={styles.formContainer}>
              {/* Email / Username */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('emailOrUsername')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'loginEmail' && styles.inputWrapperFocused,
                  ]}
                >
                  <AntDesign name="mail" size={15} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="rider@waymate.app"
                    placeholderTextColor="#64748B"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocusedField('loginEmail')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {isLoginEmailValid ? (
                    <AntDesign name="check-circle" size={14} color="#34D399" />
                  ) : null}
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('password')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'loginPassword' && styles.inputWrapperFocused,
                  ]}
                >
                  <AntDesign name="lock" size={16} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="••••••••"
                    placeholderTextColor="#64748B"
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
                      color={showLoginPassword ? '#FF5E1A' : '#94A3B8'}
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
                <View style={[styles.checkbox, keepSignedIn && styles.checkboxActive]}>
                  {keepSignedIn && <AntDesign name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberMeText}>{t('keepSignedIn')}</Text>
              </TouchableOpacity>

              {/* Primary Submit Button: LOG IN */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleLoginSubmit}
                style={styles.submitButtonTouch}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#FF5E1A', '#EA580C', '#FF9F1C']}
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
                <AntDesign name="key" size={12} color="#FF9F1C" />
                <Text style={styles.forgotPasswordBelowText}>
                  {t('forgotPasswordPrompt')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= SIGN UP FORM ================= */}
          {authMode === 'signup' && (
            <View style={styles.formContainer}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('fullName')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'signupName' && styles.inputWrapperFocused,
                  ]}
                >
                  <AntDesign name="user" size={15} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Alex Mercer"
                    placeholderTextColor="#64748B"
                    value={signupName}
                    onChangeText={setSignupName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('signupName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('emailAddress')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'signupEmail' && styles.inputWrapperFocused,
                  ]}
                >
                  <AntDesign name="mail" size={15} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="alex@adventure.com"
                    placeholderTextColor="#64748B"
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
                <Text style={styles.fieldLabel}>{t('createPassword')}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'signupPassword' && styles.inputWrapperFocused,
                  ]}
                >
                  <AntDesign name="lock" size={16} color="#94A3B8" style={styles.inputLeftIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#64748B"
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
                      color={showSignupPassword ? '#FF5E1A' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary Travel Style */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('primaryTravelStyle')}</Text>
                <View style={styles.prefRow}>
                  <TouchableOpacity
                    onPress={() => setTravelStyle('Motorcycle')}
                    style={[
                      styles.prefButton,
                      travelStyle === 'Motorcycle' && styles.prefButtonActive,
                    ]}
                  >
                    <FontAwesome6
                      name="motorcycle"
                      size={14}
                      color={travelStyle === 'Motorcycle' ? '#FF5E1A' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        travelStyle === 'Motorcycle' && styles.prefButtonTextActive,
                      ]}
                    >
                      {t('motorcycle')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTravelStyle('Road Trip')}
                    style={[
                      styles.prefButton,
                      travelStyle === 'Road Trip' && styles.prefButtonActive,
                    ]}
                  >
                    <AntDesign
                      name="car"
                      size={15}
                      color={travelStyle === 'Road Trip' ? '#FF5E1A' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        travelStyle === 'Road Trip' && styles.prefButtonTextActive,
                      ]}
                    >
                      {t('roadTrip')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTravelStyle('Backpack')}
                    style={[
                      styles.prefButton,
                      travelStyle === 'Backpack' && styles.prefButtonActive,
                    ]}
                  >
                    <FontAwesome6
                      name="person-hiking"
                      size={14}
                      color={travelStyle === 'Backpack' ? '#FF5E1A' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.prefButtonText,
                        travelStyle === 'Backpack' && styles.prefButtonTextActive,
                      ]}
                    >
                      {t('backpack')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Avatar Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('chooseAvatar')}</Text>
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
                          isSelected && styles.avatarOptionSelected,
                        ]}
                      >
                        <Image source={{ uri: avatarUri }} style={styles.avatarOptionImg} />
                        {isSelected && (
                          <View style={styles.avatarOptionCheck}>
                            <AntDesign name="check" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleSignupSubmit}
                style={styles.submitButtonTouch}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#FF5E1A', '#EA580C', '#FF9F1C']}
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
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => handleSocialAuth('Google')}
              style={[styles.socialButton, isLoading && { opacity: 0.6 }]}
              activeOpacity={0.75}
              disabled={isLoading}
            >
              <AntDesign name="google" size={16} color="#E2E8F0" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialAuth('Apple')}
              style={styles.socialButton}
              activeOpacity={0.75}
            >
              <AntDesign name="apple" size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSocialAuth('Facebook')}
              style={styles.socialButton}
              activeOpacity={0.75}
            >
              <FontAwesome6 name="facebook-f" size={15} color="#38BDF8" />
            </TouchableOpacity>
          </View>

          {/* Footer Legal */}
          <View style={styles.footerLegal}>
            <Text style={styles.footerLegalText}>
              {t('agreeTerms')}{' '}
              <Text
                style={styles.footerLink}
                onPress={() => showToast('Waymate Terms of Service', 'info')}
              >
                {t('terms')}
              </Text>{' '}
              &{' '}
              <Text
                style={styles.footerLink}
                onPress={() => showToast('Waymate Privacy Policy', 'info')}
              >
                {t('privacy')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ================= GOOGLE OAUTH MODAL ================= */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isGoogleSubmitting && setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.googleModalCard}>
            {/* Modal Header */}
            <View style={styles.googleModalHeader}>
              <View style={styles.googleIconRow}>
                <AntDesign name="google" size={24} color="#4285F4" />
                <View>
                  <Text style={styles.googleModalTitle}>{t('googleSignInTitle')}</Text>
                  <Text style={styles.googleModalSubtitle}>{t('googleSignInSubtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => !isGoogleSubmitting && setShowGoogleModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isGoogleSubmitting}
              >
                <AntDesign name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Expo Go Notice Box */}
            <View style={styles.googleNoticeBox}>
              <AntDesign name="info-circle" size={14} color="#F59E0B" style={{ marginTop: 2 }} />
              <Text style={styles.googleNoticeText}>{t('googleExpoNotice')}</Text>
            </View>

            {/* Primary Google Account Card (Lê Hoàng Lâm) */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isGoogleSubmitting}
              onPress={() =>
                handleGoogleAccountSelect(
                  'lhlam.lehoang@gmail.com',
                  'Lê Hoàng Lâm',
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'
                )
              }
              style={styles.googleAccountCard}
            >
              <View style={styles.googleAvatarCircle}>
                <Text style={styles.googleAvatarInitial}>L</Text>
              </View>
              <View style={styles.googleAccountInfo}>
                <View style={styles.googleNameRow}>
                  <Text style={styles.googleAccountName}>Lê Hoàng Lâm</Text>
                  <View style={styles.googleActiveBadge}>
                    <AntDesign name="check" size={10} color="#10B981" />
                  </View>
                </View>
                <Text style={styles.googleAccountEmail}>lhlam.lehoang@gmail.com</Text>
                <Text style={styles.googleAccountStatus}>Google Account • Ready</Text>
              </View>
              <AntDesign name="right" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* 1-Tap Quick Sign-In Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isGoogleSubmitting}
              onPress={() =>
                handleGoogleAccountSelect(
                  'lhlam.lehoang@gmail.com',
                  'Lê Hoàng Lâm',
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'
                )
              }
              style={styles.googleContinueBtn}
            >
              <LinearGradient
                colors={['#4285F4', '#34A853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.googleContinueGradient}
              >
                {isGoogleSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <AntDesign name="google" size={15} color="#FFFFFF" />
                    <Text style={styles.googleContinueText}>
                      {t('continueAsUser')} Lê Hoàng Lâm
                    </Text>
                    <AntDesign name="arrow-right" size={14} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Custom / Alternative Email Section Toggle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCustomGoogleMode(!isCustomGoogleMode)}
              style={styles.toggleCustomBtn}
            >
              <Text style={styles.toggleCustomText}>
                {isCustomGoogleMode ? '— ' + t('cancel') : '+ ' + t('googleUseOtherEmail')}
              </Text>
            </TouchableOpacity>

            {isCustomGoogleMode && (
              <View style={styles.customEmailBox}>
                <TextInput
                  style={styles.customInput}
                  placeholder={t('googleEmailPlaceholder')}
                  placeholderTextColor="#64748B"
                  value={googleCustomEmail}
                  onChangeText={setGoogleCustomEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={[styles.customInput, { marginTop: 8 }]}
                  placeholder={t('googleCustomNamePlaceholder')}
                  placeholderTextColor="#64748B"
                  value={googleCustomName}
                  onChangeText={setGoogleCustomName}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={isGoogleSubmitting || !googleCustomEmail.trim()}
                  onPress={() =>
                    handleGoogleAccountSelect(
                      googleCustomEmail.trim(),
                      googleCustomName.trim() || undefined
                    )
                  }
                  style={[
                    styles.customSubmitBtn,
                    (!googleCustomEmail.trim() || isGoogleSubmitting) && { opacity: 0.5 },
                  ]}
                >
                  <Text style={styles.customSubmitText}>{t('googleSignInBtn')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer Token Info & Optional Browser Attempt */}
            <View style={styles.googleModalFooter}>
              <View style={styles.jwtBadgeRow}>
                <AntDesign name="safety-certificate" size={12} color="#10B981" />
                <Text style={styles.jwtBadgeText}>
                  Neo4j Database Sync • 24h JWT Session Token
                </Text>
              </View>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  onPress={handleBrowserOAuth}
                  style={{ marginTop: 8 }}
                  disabled={isGoogleSubmitting}
                >
                  <Text style={{ fontSize: 11, color: '#38BDF8', textDecorationLine: 'underline' }}>
                    Open Web Browser OAuth
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(21, 28, 44, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoGradientBorder: {
    width: 54,
    height: 54,
    borderRadius: 16,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    shadowColor: '#FF5E1A',
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
    color: '#94A3B8',
  },
  formContainer: {
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 44,
  },
  inputWrapperFocused: {
    borderColor: '#FF5E1A',
  },
  inputLeftIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 12.5,
    color: '#FFFFFF',
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
    borderColor: '#475569',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF5E1A',
    borderColor: '#FF5E1A',
  },
  rememberMeText: {
    fontSize: 11.5,
    color: '#CBD5E1',
  },
  submitButtonTouch: {
    marginTop: 6,
    borderRadius: 12,
    shadowColor: '#FF5E1A',
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
    color: '#FF9F1C',
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
    borderColor: 'rgba(51, 65, 85, 0.6)',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  prefButtonActive: {
    borderColor: '#FF5E1A',
    backgroundColor: 'rgba(255, 94, 26, 0.18)',
  },
  prefButtonText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  prefButtonTextActive: {
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E293B',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLegal: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerLegalText: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
  },
  footerLink: {
    color: '#94A3B8',
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
  avatarOptionSelected: {
    borderColor: '#FF5E1A',
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
    backgroundColor: '#FF5E1A',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  googleModalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  googleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  googleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  googleModalSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  googleNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  googleNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#FCD34D',
  },
  googleAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    marginBottom: 12,
  },
  googleAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  googleAccountInfo: {
    flex: 1,
  },
  googleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  googleAccountName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  googleActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  googleAccountEmail: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 1,
  },
  googleAccountStatus: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '600',
  },
  googleContinueBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  googleContinueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
  },
  googleContinueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleCustomBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleCustomText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  customEmailBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
    color: '#FFFFFF',
  },
  customSubmitBtn: {
    backgroundColor: '#FF5E1A',
    borderRadius: 10,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  customSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  googleModalFooter: {
    marginTop: 8,
    alignItems: 'center',
  },
  jwtBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jwtBadgeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
