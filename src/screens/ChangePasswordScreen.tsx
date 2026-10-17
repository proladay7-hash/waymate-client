import React, { useState } from 'react';
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
import { useLanguage } from '../context/LanguageContext';
import { updatePasswordApi } from '../services/authApi';

interface ChangePasswordScreenProps {
  userEmail?: string;
  onBack: () => void;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

export default function ChangePasswordScreen({
  userEmail,
  onBack,
  showToast,
}: ChangePasswordScreenProps) {
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!newPassword) {
      return { score: 0, label: t('tooShort'), color: '#64748B' };
    }
    if (newPassword.length < 5) {
      return { score: 1, label: t('weak'), color: '#EF4444' };
    }
    if (newPassword.length < 8) {
      return { score: 2, label: t('moderate'), color: '#FBBF24' };
    }
    return { score: 3, label: t('strongSecure'), color: '#34D399' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async () => {
    if (!currentPassword) {
      showToast(t('currentPasswordRequired'), 'info');
      return;
    }
    if (newPassword.length < 6) {
      showToast(t('passwordMinLength'), 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('passwordsDoNotMatch'), 'info');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updatePasswordApi({
        email: userEmail || 'rider_alex@waymate.app',
        oldPassword: currentPassword,
        newPassword,
      });
      showToast(res.message || t('pwdUpdatedSuccess'), 'success');
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <AntDesign name="arrow-left" size={16} color="#94A3B8" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{t('changePwdTitle')}</Text>
            <Text style={styles.subtitle}>{t('changePwdSubtitle')}</Text>
          </View>
        </View>

        {/* Current Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('currentPassword')}</Text>
          <View style={styles.inputWrapper}>
            <AntDesign name="lock" size={16} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>
        </View>

        {/* New Password & Strength */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('newPassword')}</Text>
          <View style={styles.inputWrapper}>
            <AntDesign name="key" size={16} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Min 8 characters"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          {/* Strength Meter Bar */}
          <View style={styles.strengthContainer}>
            <View style={styles.strengthLabelRow}>
              <Text style={styles.strengthDesc}>{t('securityStrength')}:</Text>
              <Text style={[styles.strengthValue, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
            <View style={styles.strengthBarsRow}>
              <View
                style={[
                  styles.strengthBarSegment,
                  strength.score >= 1 && { backgroundColor: strength.color },
                ]}
              />
              <View
                style={[
                  styles.strengthBarSegment,
                  strength.score >= 2 && { backgroundColor: strength.color },
                ]}
              />
              <View
                style={[
                  styles.strengthBarSegment,
                  strength.score >= 3 && { backgroundColor: strength.color },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Confirm New Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('confirmNewPassword')}</Text>
          <View style={styles.inputWrapper}>
            <AntDesign name="safety" size={16} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.inputField}
              placeholder="Re-enter new password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <LinearGradient
            colors={['#FF5E1A', '#FF9F1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            {isLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.btnText}>{t('updatingPassword')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.btnText}>{t('updatePassword')}</Text>
                <AntDesign name="check" size={13} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
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
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  backBtn: {
    padding: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
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
  strengthContainer: {
    marginTop: 3,
    gap: 3,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthDesc: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  strengthValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  strengthBarSegment: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  submitBtn: {
    marginTop: 8,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
