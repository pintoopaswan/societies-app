import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  Badge,
  Surface,
  FormField,
  FormInput,
  FormButton,
} from '../components/DesignSystem';

function ModeChip({ active, label, onPress }) {
  const { colors, radius } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.modeChip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSoft,
          borderColor: active ? colors.primary : colors.border,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Text style={[styles.modeChipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, requestOtp, verifyOtp } = useAuth();
  const { colors } = useAppTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mode, setMode] = useState('otp');
  const [step, setStep] = useState('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const headerSubtext = useMemo(() => (
    mode === 'otp'
      ? 'Fast, secure access with OTP for residents, owners, and admins.'
      : 'Use your password for a familiar sign-in experience.'
  ), [mode]);

  const reset = () => {
    setStep('request');
    setOtpCode('');
    setError('');
    setInfo('');
  };

  const onSendOtp = async () => {
    setError('');
    setInfo('');
    if (!identifier.trim()) {
      setError('Email or mobile is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOtp(identifier.trim());
      setStep('verify');
      setInfo(res.message || 'OTP sent. Please enter the code below.');
      if (res.otp_code) setInfo(`${res.message}. OTP: ${res.otp_code}`);
    } catch (e) {
      setError(e.message || 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    setError('');
    if (!identifier.trim() || !otpCode.trim()) {
      setError('Identifier and OTP code are required.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(identifier.trim(), otpCode.trim());
    } catch (e) {
      setError(e.message || 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Email/mobile and password are required.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e.message || 'Unable to login with password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="office-building" size={26} color="#fff" />
          </View>
          <Badge label="SOCIETY MANAGEMENT" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>My Society</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{headerSubtext}</Text>
        </View>

        <Surface style={styles.card}>
          <View style={styles.modeRow}>
            <ModeChip active={mode === 'otp'} label="OTP Login" onPress={() => { setMode('otp'); reset(); }} />
            <ModeChip active={mode === 'password'} label="Password Login" onPress={() => { setMode('password'); reset(); }} />
          </View>

          <View style={styles.form}>
            <FormField label="Email or mobile">
              <FormInput
                value={identifier}
                onChangeText={(value) => {
                  setIdentifier(value);
                  if (step !== 'request') {
                    setStep('request');
                    setOtpCode('');
                    setInfo('');
                    setError('');
                  }
                }}
                placeholder="Enter your email or mobile"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </FormField>

            {mode === 'otp' && step === 'request' ? <Text style={[styles.helper, { color: colors.muted }]}>OTP will be sent to your registered mobile number.</Text> : null}

            {mode === 'password' ? (
              <FormField label="Password">
                <FormInput value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
              </FormField>
            ) : null}

            {mode === 'otp' && step === 'verify' ? (
              <FormField label="OTP code">
                <FormInput value={otpCode} onChangeText={setOtpCode} placeholder="Enter OTP" keyboardType="numeric" />
              </FormField>
            ) : null}

            {!!info ? <Text style={[styles.info, { color: colors.success }]}>{info}</Text> : null}
            {!!error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <View style={{ marginTop: 10, gap: 12 }}>
              <FormButton
                title={
                  mode === 'password'
                    ? 'Login with Password'
                    : step === 'request' ? 'Send OTP' : 'Login with OTP'
                }
                onPress={mode === 'password' ? onPasswordLogin : step === 'request' ? onSendOtp : onVerifyOtp}
                loading={loading}
              />

              {step === 'verify' ? (
                <FormButton title="Resend OTP" onPress={onSendOtp} tone="secondary" disabled={loading} />
              ) : null}
            </View>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.link, { color: colors.primaryBlue }]}>Register Account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={[styles.link, { color: colors.primaryBlue }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 16,
  },
  hero: {
    gap: 10,
    paddingTop: 8,
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    maxWidth: 360,
  },
  card: {
    padding: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  form: {
    gap: 10,
  },
  helper: {
    marginTop: -2,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  info: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
  },
});
