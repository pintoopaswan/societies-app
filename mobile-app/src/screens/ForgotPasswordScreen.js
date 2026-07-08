import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  Badge,
  Surface,
  FormField,
  FormInput,
  FormButton,
} from '../components/DesignSystem';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const { colors } = useAppTheme();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!identifier.trim()) {
      Alert.alert('Validation', 'Please enter email or mobile number.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(identifier.trim());
      Alert.alert('Request received', 'OTP based password reset will be available shortly.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="ACCOUNT RECOVERY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Enter your email or mobile number and we’ll guide you through recovery.</Text>
        </View>

        <Surface style={styles.card}>
          <FormField label="Email or mobile" isLast>
            <FormInput
              placeholder="Email or Mobile"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          </FormField>
        </Surface>

        <View style={styles.actions}>
          <FormButton title="Send OTP" onPress={submit} loading={loading} />
          <FormButton title="Back to Login" onPress={() => navigation.goBack()} tone="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 24, paddingBottom: 28, gap: 16 },
  hero: { gap: 10, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  card: { padding: 20 },
  actions: { gap: 12, marginTop: 8 },
});
