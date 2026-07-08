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

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const { colors } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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
          <Badge label="SECURITY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Update password</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Keep your account secure with a fresh password whenever needed.</Text>
        </View>

        <Surface style={styles.card}>
          <FormField label="Current Password">
            <FormInput
              placeholder="••••••••"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </FormField>

          <FormField label="New Password">
            <FormInput
              placeholder="••••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </FormField>

          <FormField label="Confirm New Password" isLast>
            <FormInput
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </FormField>
        </Surface>

        <View style={styles.actions}>
          <FormButton title="Update Password" onPress={submit} loading={loading} />
          <FormButton title="Cancel" onPress={() => navigation.goBack()} tone="secondary" />
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
