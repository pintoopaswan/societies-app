import React, { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
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
  const { colors } = useAppTheme();
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
    Alert.alert('Upload Payment Screenshot', 'Choose source', [
      { text: 'Camera', onPress: async () => { const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: 'payment-screenshot.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); } },
      { text: 'Gallery', onPress: async () => { const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: 'payment-screenshot.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); } },
      { text: 'PDF/File', onPress: async () => { const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true }); if (!r.canceled && r.assets?.[0]) setPaymentScreenshot({ uri: r.assets[0].uri, name: r.assets[0].name || 'payment-screenshot.pdf', type: r.assets[0].mimeType || 'application/pdf' }); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!form.block) return Alert.alert('Validation', 'Block is required.');
    if (!form.flat) return Alert.alert('Validation', 'Flat is required.');
    if (!form.amount) return Alert.alert('Validation', 'Amount is required.');
    if (!Number(form.amount) || Number(form.amount) <= 0) return Alert.alert('Validation', 'Amount must be greater than 0.');
    if (!form.payment_date) return Alert.alert('Validation', 'Payment Date is required.');
    if (!form.mode_of_payment) return Alert.alert('Validation', 'Payment Mode is required.');
    if (form.mode_of_payment === 'CASH' && !form.received_by.trim()) {
      return Alert.alert('Validation', 'Received By is required for cash payments.');
    }
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
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Collections</Text>
        <Text style={[styles.title, { color: colors.text }]}>Add Payment</Text>
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

        <FormField label="Amount (₹)*">
          <FormInput keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="0.00" />
        </FormField>

        <FormField label="Payment Date*">
          <FormButton title={form.payment_date} tone="secondary" onPress={() => setShowDate(true)} icon="calendar-outline" />
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

        <FormField label="Payment Mode*">
          <FormPicker
            value={form.mode_of_payment}
            onValueChange={(v) => set('mode_of_payment', v)}
            items={[{ label: 'ONLINE', value: 'ONLINE' }, { label: 'CASH', value: 'CASH' }]}
          />
        </FormField>

        {form.mode_of_payment === 'CASH' && (
          <FormField label="Received By*">
            <FormInput value={form.received_by} onChangeText={(v) => set('received_by', v)} placeholder="Staff name" />
          </FormField>
        )}

        <FormField label="Notes" isLast>
          <FormInput value={form.notes} onChangeText={(v) => set('notes', v)} multiline placeholder="Optional remarks" />
        </FormField>
      </Surface>

      {paymentScreenshot?.uri ? (
        <View style={styles.attachment}>
          <SectionHeader title="Screenshot" actionLabel="Replace" onAction={pickPaymentScreenshot} />
          <Surface style={{ padding: 8 }}>
            {String(paymentScreenshot.type || '').startsWith('image/') ? (
              <Image source={{ uri: paymentScreenshot.uri }} style={styles.screenshot} resizeMode="contain" />
            ) : (
              <View style={styles.fileBox}>
                <MaterialCommunityIcons name="file-pdf-box" size={24} color={colors.danger} />
                <Text style={[styles.fileName, { color: colors.text }]}>{paymentScreenshot.name}</Text>
              </View>
            )}
          </Surface>
        </View>
      ) : (
        <View style={styles.attachment}>
          <FormButton title="Upload Screenshot/PDF" tone="secondary" icon="camera-outline" onPress={pickPaymentScreenshot} />
        </View>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Payment" onPress={submit} loading={loading} disabled={!valid} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  card: { padding: 20 },
  row: { flexDirection: 'row' },
  attachment: { marginTop: 24 },
  screenshot: { width: '100%', height: 200, borderRadius: 12 },
  fileBox: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  fileName: { fontSize: 14, fontWeight: '600' },
  actions: { marginTop: 32 },
});
