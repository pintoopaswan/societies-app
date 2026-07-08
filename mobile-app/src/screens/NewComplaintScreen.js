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

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function NewComplaintScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    block: user?.block || BLOCKS[0],
    flat: user?.flat || '101',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return Alert.alert('Validation', 'Title and description are required.');
    }
    setLoading(true);
    try {
      await apiRequest('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(form),
      }, token);
      Alert.alert('Raised', 'Your complaint has been registered. The management team will review it shortly.', [
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
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Support</Text>
        <Text style={[styles.title, { color: colors.text }]}>New Complaint</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Report an issue to the society management.</Text>
      </View>

      <Surface style={styles.card}>
        <View style={styles.row}>
          <FormField label="Block*" style={{ flex: 1 }}>
            <FormPicker value={form.block} onValueChange={(v) => set('block', v)} items={BLOCKS.map(b => ({ label: b, value: b }))} />
          </FormField>
          <View style={{ width: 10 }} />
          <FormField label="Flat*" style={{ flex: 1 }}>
            <FormPicker value={form.flat} onValueChange={(v) => set('flat', v)} items={FLATS.map(f => ({ label: f, value: f }))} />
          </FormField>
        </View>

        <FormField label="Issue Headline*">
          <FormInput
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Water leakage in bathroom"
          />
        </FormField>

        <FormField label="Detailed Description*" isLast>
          <FormInput
            value={form.description}
            onChangeText={(v) => set('description', v)}
            multiline
            numberOfLines={5}
            placeholder="Please describe the problem in detail..."
            textAlignVertical="top"
          />
        </FormField>
      </Surface>

      <View style={styles.actions}>
        <FormButton
          title="Raise Complaint"
          onPress={submit}
          loading={loading}
          icon="alert-circle-outline"
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
  row: { flexDirection: 'row' },
  actions: { marginTop: 32 },
});
