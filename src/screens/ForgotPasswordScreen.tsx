import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useLanguage } from '../context/LanguageContext';
import { sendForgotPasswordOtpApi, resetPasswordApi } from '../services/authApi';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function ForgotPasswordScreen({
  onBackToLogin,
  showToast,
}: ForgotPasswordScreenProps) {
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('rider_alex@waymate.app');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Expiration countdown (60 seconds)
  const [countdown, setCountdown] = useState<number>(60);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step === 2 && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, countdown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast(t('enterEmailPasswordPrompt'), 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await sendForgotPasswordOtpApi({ email: email.trim() });
      showToast(res.message || t('otpSentHint'), 'info');
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(60);
      setIsExpired(false);
      setStep(2);
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP code', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      showToast(t('invalidOtpLength'), 'info');
      return;
    }
    if (isExpired) {
      showToast(t('codeExpired'), 'info');
      return;
    }
    setStep(3);
    showToast(t('otpVerifiedSuccess'), 'success');
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast(t('passwordMinLength'), 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('passwordsDoNotMatch'), 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await resetPasswordApi({
        email: email.trim(),
        code: otpDigits.join(''),
        newPassword,
      });
      showToast(res.message || t('pwdResetSuccess'), 'success');
      setTimeout(() => {
        onBackToLogin();
      }, 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = clean.slice(-1);
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const formattedTimer = `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}s`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Header Icon & Title */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <AntDesign name="key" size={22} color="#FF9F1C" />
          </View>
          <Text style={styles.title}>{t('resetPassword')}</Text>
          <Text style={styles.subtitle}>{t('forgotSubtitle')}</Text>
        </View>

        {/* Step Progress Indicator */}
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepDot, step === 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 1 && styles.stepDotTextActive]}>
              {t('step1Email')}
            </Text>
          </View>
          <AntDesign name="arrow-right" size={9} color="#475569" />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 2 && styles.stepDotTextActive]}>
              {t('step2Verification')}
            </Text>
          </View>
          <AntDesign name="arrow-right" size={9} color="#475569" />
          <View style={[styles.stepDot, step === 3 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step === 3 && styles.stepDotTextActive]}>
              {t('step3NewPassword')}
            </Text>
          </View>
        </View>

        {/* STEP 1: Email */}
        {step === 1 && (
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('registeredEmail')}</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="mail" size={15} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="rider@waymate.app"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.85}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#FF5E1A', '#FF9F1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnText}>SENDING OTP...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.btnText}>{t('sendOtpCode')}</Text>
                    <AntDesign name="arrow-right" size={13} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: 6-Digit OTP Verification with 1-Min Expiration Countdown */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.otpPrompt}>
              {t('enterCodeSentTo')}{' '}
              <Text style={styles.otpEmailHighlight}>{email}</Text>
            </Text>

            {/* Expiration Countdown Bar */}
            <View style={[styles.timerBadge, isExpired ? styles.timerBadgeExpired : styles.timerBadgeActive]}>
              <FontAwesome6
                name={isExpired ? 'circle-exclamation' : 'clock'}
                size={12}
                color={isExpired ? '#EF4444' : '#FBBF24'}
              />
              <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
                {isExpired ? t('codeExpired') : `${t('otpExpiresIn')}: ${formattedTimer}`}
              </Text>
            </View>

            {/* 6 Digit Inputs */}
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                    isExpired ? styles.otpBoxExpired : null,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleOtpChange(val, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Resend Code Button */}
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleSendOtp}
              disabled={isLoading || (!isExpired && countdown > 40)}
              activeOpacity={0.8}
            >
              <AntDesign
                name="reload"
                size={11}
                color={isExpired ? '#FF5E1A' : '#64748B'}
              />
              <Text
                style={[
                  styles.resendText,
                  isExpired ? styles.resendTextActive : styles.resendTextDim,
                ]}
              >
                {t('resendCode')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={isExpired}
            >
              <LinearGradient
                colors={isExpired ? ['#475569', '#334155'] : ['#FF5E1A', '#FF9F1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{t('verifyCode')}</Text>
                <AntDesign name="check" size={13} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Reset Password */}
        {step === 3 && (
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('setNewPassword')}</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="lock" size={16} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <AntDesign
                    name={showPassword ? 'eye-invisible' : 'eye'}
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('confirmNewPassword')}</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="lock" size={16} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Re-enter password"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              activeOpacity={0.85}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnText}>{t('updatingPassword')}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.btnText}>{t('saveNewPasswordLogin')}</Text>
                    <AntDesign name="check-circle" size={13} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Back to Login Link */}
        <TouchableOpacity
          style={styles.backLinkRow}
          onPress={onBackToLogin}
          activeOpacity={0.7}
        >
          <AntDesign name="arrow-left" size={12} color="#94A3B8" />
          <Text style={styles.backLinkText}>{t('backToLogIn')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(21, 28, 44, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  stepDot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  stepDotActive: {
    backgroundColor: '#FF5E1A',
    borderColor: '#FF5E1A',
  },
  stepDotText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  form: {
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12.5,
    paddingVertical: 0,
  },
  submitBtn: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#FF5E1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  btnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  otpPrompt: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  otpEmailHighlight: {
    color: '#FF9F1C',
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
  },
  timerBadgeActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  timerBadgeExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FBBF24',
  },
  timerTextExpired: {
    color: '#EF4444',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginVertical: 10,
  },
  otpBox: {
    width: 39,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#334155',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: '#FF5E1A',
    backgroundColor: 'rgba(255, 94, 26, 0.08)',
  },
  otpBoxExpired: {
    borderColor: '#475569',
    opacity: 0.6,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resendTextActive: {
    color: '#FF5E1A',
    textDecorationLine: 'underline',
  },
  resendTextDim: {
    color: '#64748B',
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  backLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
