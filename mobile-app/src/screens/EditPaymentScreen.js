import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
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
} from '../components/DesignSystem';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EditPaymentScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
  const payment = route.params?.payment;
  const onSaved = route.params?.onSaved;

  const [form, setForm] = useState({
    amount: String(payment?.amount || ''),
    payment_date: payment?.payment_date || toIsoDate(new Date()),
    mode_of_payment: payment?.mode_of_payment || 'ONLINE',
    notes: payment?.notes || '',
    status: payment?.status || 'DONE',
  });
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return Alert.alert('Validation', 'Enter valid amount.');
    setLoading(true);
    try {
      await apiRequest(`/api/payments/${payment.property_id}/${payment.year}/${payment.month}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      }, token);
      Alert.alert('Saved', 'Payment updated successfully.');
      onSaved?.();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete Payment', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiRequest(`/api/payments/${payment.property_id}/${payment.year}/${payment.month}`, { method: 'DELETE' }, token);
          onSaved?.();
          navigation.goBack();
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  if (!payment) return <Page><EmptyState title="Not Found" subtitle="Payment record not available." /></Page>;

  return (
    <Page>
      <SectionHeader
        title={`Payment: ${payment.block} · ${payment.flat}`}
        subtitle={`${MONTHS[payment.month - 1]} ${payment.year} · Ref #${payment.payment_id}`}
      />

      <Surface level={1} style={styles.card}>
        <FormField label="Transaction Amount (₹)">
          <FormInput
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(v) => set('amount', v)}
          />
        </FormField>

        <FormField label="Payment Date">
          <FormButton
            title={form.payment_date}
            tone="secondary"
            onPress={() => setShowDate(true)}
            icon="calendar"
          />
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

        <FormField label="Method">
          <FormPicker
            value={form.mode_of_payment}
            onValueChange={(v) => set('mode_of_payment', v)}
            items={[{ label: 'Online / UPI', value: 'ONLINE' }, { label: 'Cash', value: 'CASH' }]}
          />
        </FormField>

        <FormField label="Collection Status">
          <FormPicker
            value={form.status}
            onValueChange={(v) => set('status', v)}
            items={[{ label: 'Done / Received', value: 'DONE' }, { label: 'Pending', value: 'PENDING' }, { label: 'Locked', value: 'LOCKED' }]}
          />
        </FormField>

        <FormField label="Notes" isLast>
          <FormInput
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            numberOfLines={3}
            placeholder="Add internal remarks..."
          />
        </FormField>
      </Surface>

      {payment.payment_screenshot_path ? (
        <View style={styles.attachment}>
          <SectionHeader title="Payment Proof" />
          <Surface level={2} style={styles.screenshotContainer}>
            <Image
              source={{ uri: `${API_BASE_URL}/static/${payment.payment_screenshot_path}` }}
              style={styles.screenshot}
              resizeMode="contain"
            />
          </Surface>
        </View>
      ) : null}

      <View style={styles.actions}>
        <FormButton title="Update Receipt" onPress={submit} loading={loading} />
        <FormButton title="Delete Record" onPress={remove} tone="danger" />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  attachment: { marginTop: 32 },
  screenshotContainer: { padding: 12, borderRadius: radius.xl },
  screenshot: { width: '100%', height: 320, borderRadius: radius.lg },
  actions: { marginTop: 40, gap: 16 },
});
