import React, { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, requestOtp, verifyOtp } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [mode, setMode] = useState('otp');
  const [step, setStep] = useState('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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
      if (res.otp_code) {
        setInfo(`${res.message}. OTP: ${res.otp_code}`);
      }
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

  const onReset = () => {
    setStep('request');
    setOtpCode('');
    setError('');
    setInfo('');
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=60' }}
      style={styles.bg}
    >
      <View style={styles.overlay}>
        <View style={styles.headerWrap}>
          <View style={styles.logoWrap}><MaterialCommunityIcons name="office-building" size={30} color="#fff" /></View>
          <Text style={styles.title}>My Society</Text>
          <Text style={styles.subtitle}>Smart society operations for residents, owners, tenants, and admins.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'otp' && styles.modeButtonActive]}
              onPress={() => {
                setMode('otp');
                onReset();
              }}
            >
              <Text style={[styles.modeButtonText, mode === 'otp' && styles.modeButtonTextActive]}>OTP Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'password' && styles.modeButtonActive]}
              onPress={() => {
                setMode('password');
                onReset();
              }}
            >
              <Text style={[styles.modeButtonText, mode === 'password' && styles.modeButtonTextActive]}>Password Login</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
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
            placeholder="Email or Mobile"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {mode === 'otp' && step === 'request' && (
            <Text style={styles.helper}>OTP will be sent to your registered mobile number.</Text>
          )}
          {mode === 'password' && (
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
          )}
          {mode === 'otp' && step === 'verify' && (
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="Enter OTP"
              keyboardType="numeric"
            />
          )}

          {!!info && <Text style={styles.infoText}>{info}</Text>}
          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={mode === 'password' ? onPasswordLogin : step === 'request' ? onSendOtp : onVerifyOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {mode === 'password'
                ? loading
                  ? 'Signing in...'
                  : 'Login with Password'
                : loading
                ? step === 'request'
                  ? 'Sending OTP...'
                  : 'Verifying...'
                : step === 'request'
                ? 'Send OTP'
                : 'Login with OTP'}
            </Text>
          </TouchableOpacity>

          {step === 'verify' && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onSendOtp} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Resend OTP</Text>
            </TouchableOpacity>
          )}

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(12,34,56,0.55)', justifyContent: 'center', padding: 22 },
  headerWrap: { marginBottom: 16 },
  logoWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#20343a', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#dce8f7', marginTop: 4, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#26486a', shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  input: { backgroundColor: '#f8fbff', borderRadius: 10, padding: 12, marginBottom: 10, borderColor: '#d3deea', borderWidth: 1 },
  modeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modeButton: { flex: 1, backgroundColor: '#edf2f7', padding: 10, borderRadius: 10, marginRight: 8 },
  modeButtonActive: { backgroundColor: '#20343a' },
  modeButtonText: { textAlign: 'center', color: '#20343a', fontWeight: '700' },
  modeButtonTextActive: { color: '#fff' },
  button: { backgroundColor: '#20343a', padding: 14, borderRadius: 10, marginTop: 4 },
  secondaryButton: { backgroundColor: '#eef5ff', padding: 12, borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondaryButtonText: { color: '#20343a', textAlign: 'center', fontWeight: '700' },
  error: { color: '#c53030', marginBottom: 6 },
  infoText: { color: '#2d6a4f', marginBottom: 6 },
  helper: { color: '#4a5568', marginBottom: 6, fontSize: 12 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  link: { color: '#20343a', fontWeight: '700' },
});
