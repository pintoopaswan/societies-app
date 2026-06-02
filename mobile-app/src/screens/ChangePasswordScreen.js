import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { Badge, Surface } from '../components/DesignSystem';
import { useAppTheme } from '../lib/theme';

function Field({ label, value, onChangeText, placeholder }) {
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
        secureTextEntry
      />
    </View>
  );
}

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const { colors } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Updated', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Unable to change password', e.message || 'Try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="SECURITY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Change password</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Keep your account secure with a fresh password whenever needed.</Text>
        </View>

        <Surface style={styles.card}>
          <View style={{ gap: 10 }}>
            <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" />
            <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="New password" />
            <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" />
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={submit}>
              <Text style={styles.buttonText}>Update password</Text>
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
  button: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
