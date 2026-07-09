import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  Badge,
  Surface,
  FormField,
  FormInput,
  FormButton,
  SectionHeader,
} from '../components/DesignSystem';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const { colors, radius } = useAppTheme();
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
      Alert.alert('Request Received', 'OTP based password reset will be enabled for your account shortly.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Account Recovery" subtitle="Restore access to your community account." />

        <Surface level={1} style={styles.card}>
          <FormField label="Identifier" isLast>
            <FormInput
              placeholder="Email address or mobile number"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          </FormField>
        </Surface>

        <View style={styles.actions}>
          <FormButton title="Request Reset" onPress={submit} loading={loading} icon="lock-reset" />
          <FormButton title="Back to Login" onPress={() => navigation.goBack()} tone="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40, gap: 24 },
  card: { padding: 24, borderRadius: radius.xxl },
  actions: { gap: 16 },
});
