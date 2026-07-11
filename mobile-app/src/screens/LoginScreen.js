import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography, radius } from '../lib/theme';
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
  const { colors, dark } = useAppTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onPasswordLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Identity and password are required.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
              <MaterialCommunityIcons name="shield-home" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.onSurface }]}>SocietyHub</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              The premium standard for community living.
            </Text>
          </View>

          {/* Form Card */}
          <Surface level={1} style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={[styles.loginTitle, { color: colors.onSurface }]}>Welcome Back</Text>
              <Text style={[styles.loginSubtitle, { color: colors.onSurfaceVariant }]}>Sign in to continue</Text>
            </View>

            <View style={styles.formGroup}>
              <FormField label="Email or Mobile">
                <FormInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </FormField>

              <FormField label="Password" isLast>
                <FormInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry
                />
              </FormField>
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.errorContainer }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.onErrorContainer }]}>{error}</Text>
              </View>
            )}

            <FormButton
              title="Sign In"
              onPress={onPasswordLogin}
              loading={loading}
              icon="chevron-right"
              style={styles.submitBtn}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={[styles.actionLink, { color: colors.primary }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </Surface>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
              New to the community?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerBtn}>
              <Text style={[styles.registerBtnText, { color: colors.primary }]}>Request Access</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      }
    })
  },
  title: {
    ...typography.displaySmall,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  formCard: {
    padding: 32,
    borderRadius: 32,
  },
  formHeader: {
    marginBottom: 24,
  },
  loginTitle: {
    ...typography.headlineSmall,
    fontWeight: '800',
  },
  loginSubtitle: {
    ...typography.bodyMedium,
    marginTop: 4,
  },
  formGroup: {
    gap: 4,
  },
  submitBtn: {
    marginTop: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  errorText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    flex: 1,
  },
  actionRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  actionLink: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 8,
  },
  footerText: {
    ...typography.bodyMedium,
  },
  registerBtnText: {
    ...typography.labelLarge,
    fontWeight: '800',
  },
});
