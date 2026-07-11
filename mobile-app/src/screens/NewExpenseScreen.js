import React, { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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

export default function NewExpenseScreen({ navigation }) {
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
  const today = new Date();

  const [form, setForm] = useState({
    item_name: '',
    amount: '',
    transaction_date: toIsoDate(today),
    quantity: '',
    payment_mode: 'ONLINE',
    paid_by: '',
  });
  const [showDate, setShowDate] = useState(false);
  const [billImage, setBillImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const valid = useMemo(() => form.item_name.trim() && Number(form.amount) > 0 && form.transaction_date, [form]);

  const pickBillImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!r.canceled && r.assets?.[0]) {
      setBillImage({
        uri: r.assets[0].uri,
        name: 'bill.jpg',
        type: r.assets[0].mimeType || 'image/jpeg',
      });
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries({ ...form, amount: Number(form.amount) }).forEach(([k, v]) => body.append(k, String(v ?? '')));
      if (billImage) body.append('bill', billImage);
      await apiRequest('/api/expenses', {
        method: 'POST',
        body,
      }, token);
      navigation.navigate('ExpensesList', { ts: Date.now() });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <SectionHeader title="Log Expense" subtitle="Record a new society expenditure." />

      <Surface level={1} style={styles.card}>
        <FormField label="Expense Item">
          <FormInput value={form.item_name} onChangeText={(v) => set('item_name', v)} placeholder="e.g. Lift Maintenance" />
        </FormField>

        <FormField label="Amount (₹)">
          <FormInput keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="0.00" />
        </FormField>

        <FormField label="Transaction Date">
          <FormButton title={form.transaction_date} tone="secondary" onPress={() => setShowDate(true)} icon="calendar" />
          {showDate && (
            <DateTimePicker
              value={safeDateFromIso(form.transaction_date)}
              mode="date"
              onChange={(event, d) => {
                setShowDate(false);
                if (d) set('transaction_date', toIsoDate(d));
              }}
            />
          )}
        </FormField>

        <FormField label="Paid By">
          <FormInput value={form.paid_by} onChangeText={(v) => set('paid_by', v)} placeholder="e.g. Secretary or Vendor name" />
        </FormField>

        <FormField label="Method">
          <FormPicker
            value={form.payment_mode}
            onValueChange={(v) => set('payment_mode', v)}
            items={[{ label: 'Online / UPI', value: 'ONLINE' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }]}
          />
        </FormField>

        <FormField label="Quantity / Notes" isLast>
          <FormInput value={form.quantity} onChangeText={(v) => set('quantity', v)} placeholder="Additional details..." />
        </FormField>
      </Surface>

      <View style={styles.attachmentSection}>
        <SectionHeader title="Invoice / Bill" subtitle="Attach a photo of the physical bill." />
        {billImage?.uri ? (
          <Surface level={2} style={styles.attachmentPreview}>
            <Image source={{ uri: billImage.uri }} style={styles.screenshot} resizeMode="cover" />
            <FormButton title="Replace Bill" tone="outlined" onPress={pickBillImage} style={{ marginTop: 12 }} />
          </Surface>
        ) : (
          <FormButton title="Upload Bill Image" tone="outlined" icon="camera" onPress={pickBillImage} />
        )}
      </View>

      <View style={styles.actions}>
        <FormButton title="Confirm Expense" onPress={submit} loading={loading} disabled={!valid} />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  attachmentSection: { marginTop: 32 },
  attachmentPreview: { padding: 16, borderRadius: radius.xl, alignItems: 'center' },
  screenshot: { width: '100%', height: 240, borderRadius: radius.lg },
  actions: { marginTop: 40 },
});
