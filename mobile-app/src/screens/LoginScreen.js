import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { Badge, Surface } from '../components/DesignSystem';
import { useAppTheme } from '../lib/theme';

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences' }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function ModeChip({ active, label, onPress }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.modeChip,
        {
          backgroundColor: active ? colors.primary : colors.surfaceSoft,
          borderColor: active ? colors.primary : colors.border,
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
            <Field
              label="Email or mobile"
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

            {mode === 'otp' && step === 'request' ? <Text style={[styles.helper, { color: colors.muted }]}>OTP will be sent to your registered mobile number.</Text> : null}

            {mode === 'password' ? (
              <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
            ) : null}

            {mode === 'otp' && step === 'verify' ? (
              <Field label="OTP code" value={otpCode} onChangeText={setOtpCode} placeholder="Enter OTP" keyboardType="numeric" />
            ) : null}

            {!!info ? <Text style={[styles.info, { color: colors.success }]}>{info}</Text> : null}
            {!!error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={mode === 'password' ? onPasswordLogin : step === 'request' ? onSendOtp : onVerifyOtp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {mode === 'password'
                  ? loading ? 'Signing in...' : 'Login with Password'
                  : loading
                    ? step === 'request' ? 'Sending OTP...' : 'Verifying...'
                    : step === 'request' ? 'Send OTP' : 'Login with OTP'}
              </Text>
            </TouchableOpacity>

            {step === 'verify' ? (
              <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={onSendOtp} disabled={loading}>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Resend OTP</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.link, { color: colors.primaryBlue }]}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={[styles.link, { color: colors.primaryBlue }]}>Forgot Password</Text>
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
    borderRadius: 28,
    padding: 18,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
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
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  helper: {
    marginTop: -2,
    fontSize: 12,
    lineHeight: 18,
  },
  info: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
  },
});
