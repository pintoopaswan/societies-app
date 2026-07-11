import React, { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import { safeDateFromIso, toIsoDate } from '../lib/date';
import {
  SectionHeader,
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

export default function NewPaymentScreen({ navigation }) {
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
  const today = new Date();

  const [form, setForm] = useState({
    block: BLOCKS[0],
    flat: '101',
    amount: '',
    payment_date: toIsoDate(today),
    mode_of_payment: 'ONLINE',
    received_by: '',
    notes: '',
  });
  const [showDate, setShowDate] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const valid = useMemo(() => form.block && form.flat && Number(form.amount) > 0 && form.payment_date && form.mode_of_payment, [form]);

  const pickPaymentScreenshot = async () => {
    Alert.alert('Upload Receipt', 'Choose source', [
      { text: 'Camera', onPress: async () => { const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: 'payment-screenshot.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); } },
      { text: 'Gallery', onPress: async () => { const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: 'payment-screenshot.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); } },
      { text: 'PDF/File', onPress: async () => { const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: r.assets[0].name || 'payment-screenshot.pdf', type: r.assets[0].mimeType || 'application/pdf' }); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    const payDate = safeDateFromIso(form.payment_date);
    const year = payDate.getFullYear();
    const month = payDate.getMonth() + 1;
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries({ ...form, year, month, amount: Number(form.amount) }).forEach(([k, v]) => body.append(k, String(v ?? '')));
      if (paymentScreenshot) body.append('payment_screenshot', paymentScreenshot);
      await apiRequest('/api/payments', {
        method: 'POST',
        body,
      }, token);
      navigation.navigate('PaymentsList', { preset: { scope: 'month', year, month }, ts: Date.now() });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <SectionHeader title="Record Payment" subtitle="Enter collection details for a flat." />

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

        <FormField label="Amount (₹)">
          <FormInput keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="0.00" />
        </FormField>

        <FormField label="Payment Date">
          <FormButton title={form.payment_date} tone="secondary" onPress={() => setShowDate(true)} icon="calendar" />
          {showDate && (
            <DateTimePicker
              value={safeDateFromIso(form.payment_date)}
              mode="date"
              onChange={(event, d) => {
                setShowDate(false);
                if (d) set('payment_date', toIsoDate(d));
              }}
            />
          )}
        </FormField>

        <FormField label="Payment Mode">
          <FormPicker
            value={form.mode_of_payment}
            onValueChange={(v) => set('mode_of_payment', v)}
            items={[{ label: 'Online / UPI', value: 'ONLINE' }, { label: 'Cash', value: 'CASH' }]}
          />
        </FormField>

        {form.mode_of_payment === 'CASH' && (
          <FormField label="Received By">
            <FormInput value={form.received_by} onChangeText={(v) => set('received_by', v)} placeholder="Manager or Guard name" />
          </FormField>
        )}

        <FormField label="Notes (Optional)" isLast>
          <FormInput value={form.notes} onChangeText={(v) => set('notes', v)} multiline numberOfLines={3} placeholder="Add any remarks..." />
        </FormField>
      </Surface>

      <View style={styles.attachmentSection}>
        <SectionHeader title="Supporting Document" subtitle="Attach a photo of the receipt or screenshot." />
        {paymentScreenshot?.uri ? (
          <Surface level={2} style={styles.attachmentPreview}>
            {String(paymentScreenshot.type || '').startsWith('image/') ? (
              <Image source={{ uri: paymentScreenshot.uri }} style={styles.screenshot} resizeMode="cover" />
            ) : (
              <View style={styles.fileBox}>
                <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.error} />
                <Text style={[styles.fileName, { color: colors.onSurface }]}>{paymentScreenshot.name}</Text>
              </View>
            )}
            <FormButton title="Replace File" tone="outlined" onPress={pickPaymentScreenshot} style={{ marginTop: 12 }} />
          </Surface>
        ) : (
          <FormButton title="Upload Receipt" tone="outlined" icon="camera" onPress={pickPaymentScreenshot} />
        )}
      </View>

      <View style={styles.actions}>
        <FormButton title="Save Record" onPress={submit} loading={loading} disabled={!valid} />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  formRow: { flexDirection: 'row' },
  attachmentSection: { marginTop: 32 },
  attachmentPreview: { padding: 16, borderRadius: radius.xl, alignItems: 'center' },
  screenshot: { width: '100%', height: 200, borderRadius: radius.lg },
  fileBox: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  fileName: { ...typography.bodyMedium, fontWeight: '700' },
  actions: { marginTop: 40 },
});
