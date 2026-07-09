import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
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
  const { colors, shadow } = useAppTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onPasswordLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Identifier and password are required.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Background Decorative Elements for Depth */}
      <View style={[styles.bgCircle, { top: -50, right: -50, backgroundColor: colors.primary + '10', width: 300, height: 300 }]} />
      <View style={[styles.bgCircle, { bottom: -100, left: -100, backgroundColor: colors.secondary + '08', width: 400, height: 400 }]} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.perspectiveContainer}>

          {/* Header 3D Layer */}
          <View style={[styles.hero, styles.layer1]}>
            <Surface level={3} style={styles.brandMark}>
              <MaterialCommunityIcons name="office-building" size={40} color={colors.primary} />
            </Surface>
            <Badge label="PREMIUM EXPERIENCE" tone="info" />
            <Text style={[styles.title, { color: colors.onSurface }]}>My Society</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Secure community management for modern living.
            </Text>
          </View>

          {/* Login Card 3D Layer */}
          <Surface level={2} style={[styles.card, styles.layer2]}>
            <View style={styles.form}>
              <Text style={[styles.loginHeader, { color: colors.onSurface }]}>Sign In</Text>

              <FormField label="Email or Mobile">
                <FormInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="e.g. resident@example.com"
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
                <View style={[styles.errorContainer, { backgroundColor: colors.errorContainer }]}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.error, { color: colors.onErrorContainer }]}>{error}</Text>
                </View>
              ) : null}

              <View style={{ marginTop: 12 }}>
                <FormButton
                  title="Sign In"
                  onPress={onPasswordLogin}
                  loading={loading}
                  icon="login"
                />
              </View>

              <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={[styles.link, { color: colors.primary }]}>Join Community</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.link, { color: colors.primary }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Surface>

          {/* Footer Sub-layer */}
          <View style={[styles.footer, styles.layer3]}>
            <Text style={[styles.versionText, { color: colors.onSurfaceVariant }]}>
              Production Grade · Version 2.1
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
    paddingTop: 40,
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
    padding: 32,
    borderRadius: 32,
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
    ...typography.headlineLarge,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 24,
  },
  loginHeader: {
    ...typography.headlineSmall,
    fontWeight: '800',
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  error: {
    ...typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  link: {
    ...typography.labelLarge,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
  },
  versionText: {
    ...typography.labelSmall,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
