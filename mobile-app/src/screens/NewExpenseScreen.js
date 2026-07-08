import React, { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
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

export default function NewExpenseScreen({ navigation }) {
  const { token } = useAuth();
  const { colors } = useAppTheme();
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
    if (!form.item_name.trim()) return Alert.alert('Validation', 'Item name is required.');
    if (!Number(form.amount) || Number(form.amount) <= 0) return Alert.alert('Validation', 'Enter valid amount.');
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
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Accounting</Text>
        <Text style={[styles.title, { color: colors.text }]}>Add Expense</Text>
      </View>

      <Surface style={styles.card}>
        <FormField label="Item Name*">
          <FormInput value={form.item_name} onChangeText={(v) => set('item_name', v)} placeholder="e.g. Generator Repair" />
        </FormField>

        <FormField label="Amount (₹)*">
          <FormInput keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="0.00" />
        </FormField>

        <FormField label="Transaction Date*">
          <FormButton title={form.transaction_date} tone="secondary" onPress={() => setShowDate(true)} icon="calendar-outline" />
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
          <FormInput value={form.paid_by} onChangeText={(v) => set('paid_by', v)} placeholder="Payer name" />
        </FormField>

        <FormField label="Payment Mode">
          <FormPicker
            value={form.payment_mode}
            onValueChange={(v) => set('payment_mode', v)}
            items={[{ label: 'ONLINE', value: 'ONLINE' }, { label: 'CASH', value: 'CASH' }, { label: 'CHEQUE', value: 'CHEQUE' }]}
          />
        </FormField>

        <FormField label="Quantity/Notes" isLast>
          <FormInput value={form.quantity} onChangeText={(v) => set('quantity', v)} placeholder="Optional details" />
        </FormField>
      </Surface>

      {billImage?.uri ? (
        <View style={styles.attachment}>
          <SectionHeader title="Bill Copy" actionLabel="Replace" onAction={pickBillImage} />
          <Surface style={{ padding: 8 }}>
            <Image source={{ uri: billImage.uri }} style={styles.screenshot} resizeMode="contain" />
          </Surface>
        </View>
      ) : (
        <View style={styles.attachment}>
          <FormButton title="Upload Bill Copy" tone="secondary" icon="camera-outline" onPress={pickBillImage} />
        </View>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Expense" onPress={submit} loading={loading} disabled={!valid} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  card: { padding: 20 },
  attachment: { marginTop: 24 },
  screenshot: { width: '100%', height: 200, borderRadius: 12 },
  actions: { marginTop: 32 },
});
