import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const { colors, shadow, radius } = useAppTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      {/* Background Decorative Elements for Depth */}
      <View style={[styles.bgCircle, { top: -50, right: -50, backgroundColor: colors.primaryBlue + '10', width: 300, height: 300 }]} />
      <View style={[styles.bgCircle, { bottom: -100, left: -100, backgroundColor: colors.accent + '08', width: 400, height: 400 }]} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.perspectiveContainer}>

          {/* Header 3D Layer */}
          <View style={[styles.hero, styles.layer1]}>
            <View style={[styles.brandMark, { backgroundColor: colors.primary, ...shadow.lift }]}>
              <MaterialCommunityIcons name="office-building" size={32} color="#fff" />
            </View>
            <Badge label="PREMIUM EXPERIENCE" tone="info" />
            <Text style={[styles.title, { color: colors.text }]}>My Society</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Secure access for residents, owners, and administrators.
            </Text>
          </View>

          {/* Login Card 3D Layer */}
          <Surface style={[styles.card, styles.layer2, { ...shadow.lift }]}>
            <View style={styles.form}>
              <Text style={[styles.loginHeader, { color: colors.text }]}>Sign In</Text>

              <FormField label="Email or mobile">
                <FormInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Enter your email or mobile"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </FormField>

              <FormField label="Password" isLast>
                <FormInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                />
              </FormField>

              {!!error ? (
                <View style={[styles.errorContainer, { backgroundColor: colors.danger + '10' }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <View style={{ marginTop: 10 }}>
                <FormButton
                  title="Sign In"
                  onPress={onPasswordLogin}
                  loading={loading}
                />
              </View>

              <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[styles.link, { color: colors.primaryBlue }]}>New here? Register</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.link, { color: colors.primaryBlue }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Surface>

          {/* Footer Sub-layer */}
          <View style={[styles.footer, styles.layer3]}>
            <Text style={[styles.versionText, { color: colors.muted }]}>
              Production Grade · Version 2.0
            </Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  perspectiveContainer: {
    alignItems: 'center',
    width: '100%',
  },
  layer1: {
    transform: [
      { perspective: 1200 },
      { rotateX: '5deg' },
      { translateY: 10 },
      { scale: 1.05 },
    ],
    zIndex: 3,
    marginBottom: -20,
    alignItems: 'center',
    textAlign: 'center',
  },
  layer2: {
    width: '100%',
    maxWidth: 420,
    transform: [
      { perspective: 1200 },
      { rotateX: '12deg' },
      { rotateY: '-2deg' },
    ],
    zIndex: 2,
    padding: 28,
  },
  layer3: {
    marginTop: 20,
    transform: [
      { perspective: 1200 },
      { rotateX: '-10deg' },
      { translateY: -10 },
      { scale: 0.95 },
    ],
    zIndex: 1,
    opacity: 0.8,
  },
  hero: {
    gap: 12,
    alignItems: 'center',
    paddingBottom: 40,
  },
  brandMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    borderRadius: 32,
  },
  loginHeader: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  form: {
    gap: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
