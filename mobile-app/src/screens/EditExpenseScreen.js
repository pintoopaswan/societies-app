import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import { safeDateFromIso, toIsoDate } from '../lib/date';
import { API_BASE_URL } from '../lib/config';
import {
  SectionHeader,
  Surface,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
  EmptyState,
} from '../components/DesignSystem';

export default function EditExpenseScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
  const expense = route.params?.expense;
  const onSaved = route.params?.onSaved;

  const [form, setForm] = useState({
    item_name: expense?.item_name || '',
    amount: String(expense?.amount || ''),
    transaction_date: expense?.transaction_date || toIsoDate(new Date()),
    quantity: expense?.quantity || '',
    payment_mode: expense?.payment_mode || 'ONLINE',
    paid_by: expense?.paid_by || '',
  });
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newBill, setNewBill] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pickBill = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!r.canceled && r.assets?.[0]) {
      setNewBill({
        uri: r.assets[0].uri,
        name: 'bill.jpg',
        type: r.assets[0].mimeType || 'image/jpeg',
      });
    }
  };

  const submit = async () => {
    if (!form.item_name.trim()) return Alert.alert('Validation', 'Item name is required.');
    if (!form.amount || Number(form.amount) <= 0) return Alert.alert('Validation', 'Enter valid amount.');
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries({ ...form, amount: Number(form.amount) }).forEach(([k, v]) => body.append(k, String(v)));
      if (newBill) body.append('bill', newBill);

      await apiRequest(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        body,
      }, token);
      Alert.alert('Saved', 'Expense record updated.');
      onSaved?.();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete Expense', 'This record will be permanently removed. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiRequest(`/api/expenses/${expense.id}`, { method: 'DELETE' }, token);
          onSaved?.();
          navigation.goBack();
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  if (!expense) return <Page><EmptyState title="Not Found" subtitle="Expense record not available." /></Page>;

  return (
    <Page>
      <SectionHeader title="Edit Expense" subtitle={`Record ID: #${expense.id}`} />

      <Surface level={1} style={styles.card}>
        <FormField label="Expense Item">
          <FormInput
            value={form.item_name}
            onChangeText={(v) => set('item_name', v)}
            placeholder="e.g. Garden maintenance"
          />
        </FormField>

        <FormField label="Amount (₹)">
          <FormInput
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(v) => set('amount', v)}
          />
        </FormField>

        <FormField label="Transaction Date">
          <FormButton
            title={form.transaction_date}
            tone="secondary"
            onPress={() => setShowDate(true)}
            icon="calendar"
          />
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
          <FormInput
            value={form.paid_by}
            onChangeText={(v) => set('paid_by', v)}
            placeholder="Name of payer"
          />
        </FormField>

        <FormField label="Method">
          <FormPicker
            value={form.payment_mode}
            onValueChange={(v) => set('payment_mode', v)}
            items={[{ label: 'Online / UPI', value: 'ONLINE' }, { label: 'Cash', value: 'CASH' }, { label: 'Cheque', value: 'CHEQUE' }]}
          />
        </FormField>

        <FormField label="Quantity / Notes" isLast>
          <FormInput
            value={form.quantity}
            onChangeText={(v) => set('quantity', v)}
            placeholder="Additional details..."
          />
        </FormField>
      </Surface>

      <View style={styles.attachmentSection}>
        <SectionHeader title="Invoice / Bill" />
        {(newBill || expense.bill_image_path) ? (
          <Surface level={2} style={styles.attachmentPreview}>
            <Image
              source={{ uri: newBill ? newBill.uri : `${API_BASE_URL}/static/${expense.bill_image_path}` }}
              style={styles.screenshot}
              resizeMode="contain"
            />
            <FormButton title="Change Document" tone="outlined" onPress={pickBill} style={{ marginTop: 12 }} />
          </Surface>
        ) : (
          <FormButton title="Upload Bill Image" tone="outlined" icon="camera" onPress={pickBill} />
        )}
      </View>

      <View style={styles.actions}>
        <FormButton title="Save Changes" onPress={submit} loading={loading} />
        <FormButton title="Delete Record" onPress={remove} tone="danger" />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  attachmentSection: { marginTop: 32 },
  attachmentPreview: { padding: 16, borderRadius: radius.xl, alignItems: 'center' },
  screenshot: { width: '100%', height: 320, borderRadius: radius.lg },
  actions: { marginTop: 40, gap: 16 },
});
