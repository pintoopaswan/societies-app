import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  Surface,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
  SectionHeader,
} from '../components/DesignSystem';

const CATEGORIES = ['GENERAL', 'MAINTENANCE', 'EMERGENCY', 'EVENT', 'FINANCE'];

export default function NewNoticeScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
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
      <SectionHeader title="Create Notice" subtitle="Publish a community-wide announcement." />

      <Surface level={1} style={styles.card}>
        <FormField label="Notice Headline">
          <FormInput
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Society Maintenance Update"
          />
        </FormField>

        <FormField label="Category Tag">
          <FormPicker
            value={form.category}
            onValueChange={(v) => set('category', v)}
            items={CATEGORIES.map(c => ({ label: c, value: c }))}
          />
        </FormField>

        <FormField label="Announcement Details" isLast>
          <FormInput
            value={form.body}
            onChangeText={(v) => set('body', v)}
            multiline
            numberOfLines={6}
            placeholder="Type the message for residents..."
            textAlignVertical="top"
          />
        </FormField>
      </Surface>

      <View style={styles.actions}>
        <FormButton
          title="Share with Community"
          onPress={submit}
          loading={loading}
          icon="bullhorn"
        />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  actions: { marginTop: 40 },
});
