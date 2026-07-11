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

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function NewComplaintScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { colors, radius } = useAppTheme();
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
      Alert.alert('Success', 'Your complaint has been registered and will be reviewed shortly.', [
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
      <SectionHeader title="Raise Complaint" subtitle="Report a service issue or maintenance request." />

      <Surface level={1} style={styles.card}>
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <FormField label="Block">
              <FormPicker value={form.block} onValueChange={(v) => set('block', v)} items={BLOCKS.map(b => ({ label: b, value: b }))} />
            </FormField>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FormField label="Flat">
              <FormPicker value={form.flat} onValueChange={(v) => set('flat', v)} items={FLATS.map(f => ({ label: f, value: f }))} />
            </FormField>
          </View>
        </View>

        <FormField label="Complaint Headline">
          <FormInput
            value={form.title}
            onChangeText={(v) => set('title', v)}
            placeholder="e.g. Electrical spark in hallway"
          />
        </FormField>

        <FormField label="Describe the issue" isLast>
          <FormInput
            value={form.description}
            onChangeText={(v) => set('description', v)}
            multiline
            numberOfLines={5}
            placeholder="Please provide details to help us resolve this faster..."
            textAlignVertical="top"
          />
        </FormField>
      </Surface>

      <View style={styles.actions}>
        <FormButton
          title="Submit Ticket"
          onPress={submit}
          loading={loading}
          icon="alert-circle"
        />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  formRow: { flexDirection: 'row' },
  actions: { marginTop: 40 },
});
