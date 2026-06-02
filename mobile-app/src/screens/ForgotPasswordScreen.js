import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { Badge, Surface } from '../components/DesignSystem';
import { useAppTheme } from '../lib/theme';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const { colors } = useAppTheme();
  const [identifier, setIdentifier] = useState('');

  const submit = async () => {
    if (!identifier.trim()) {
      Alert.alert('Missing details', 'Please enter email or mobile number.');
      return;
    }
    try {
      await forgotPassword(identifier.trim());
      Alert.alert('Request received', 'OTP based password reset will be implemented next.');
    } catch (e) {
      Alert.alert('Unable to submit', e.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="ACCOUNT RECOVERY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Enter your email or mobile number and we’ll guide you through recovery.</Text>
        </View>

        <Surface style={styles.card}>
          <View style={{ gap: 10 }}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: colors.muted }]}>Email or mobile</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Email or Mobile"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
              />
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={submit}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingTop: 24, paddingBottom: 28, gap: 16 },
  hero: { gap: 10 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  card: { borderRadius: 28, padding: 18 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { borderRadius: 16, borderWidth: 1, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600' },
  button: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
