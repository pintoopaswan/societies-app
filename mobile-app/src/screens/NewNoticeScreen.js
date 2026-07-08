import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import {
  Surface,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
} from '../components/DesignSystem';

const CATEGORIES = ['GENERAL', 'MAINTENANCE', 'EMERGENCY', 'EVENT', 'FINANCE'];

export default function NewNoticeScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: 'GENERAL',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      return Alert.alert('Validation', 'Title and message are required.');
    }
    setLoading(true);
    try {
      await apiRequest('/api/notices', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token);
      Alert.alert('Published', 'Notice has been shared with the community.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Community</Text>
        <Text style={[styles.title, { color: colors.text }]}>New Notice</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Publish an announcement to all residents.</Text>
      </View>

      <Surface style={styles.card}>
        <FormField label="Headline*">
          <FormInput
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Annual General Meeting"
          />
        </FormField>

        <FormField label="Category">
          <FormPicker
            value={form.category}
            onValueChange={(v) => set('category', v)}
            items={CATEGORIES.map(c => ({ label: c, value: c }))}
          />
        </FormField>

        <FormField label="Message Content*" isLast>
          <FormInput
            value={form.body}
            onChangeText={(v) => set('body', v)}
            multiline
            numberOfLines={6}
            placeholder="Write your announcement here..."
            textAlignVertical="top"
          />
        </FormField>
      </Surface>

      <View style={styles.actions}>
        <FormButton
          title="Publish Notice"
          onPress={submit}
          loading={loading}
          icon="bullhorn-outline"
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 8, lineHeight: 22 },
  card: { padding: 20 },
  actions: { marginTop: 32 },
});
