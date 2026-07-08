import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
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
  const { colors } = useAppTheme();
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
    Alert.alert('Delete payment', 'Are you sure?', [
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

  if (!payment) return <Page><Text>Record not found.</Text></Page>;

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Record #{payment.payment_id}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{payment.block} · {payment.flat}</Text>
        <Text style={[styles.period, { color: colors.muted }]}>{MONTHS[payment.month - 1]} {payment.year}</Text>
      </View>

      <Surface style={styles.card}>
        <FormField label="Amount (₹)">
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
            icon="calendar-outline"
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

        <FormField label="Payment Mode">
          <FormPicker
            value={form.mode_of_payment}
            onValueChange={(v) => set('mode_of_payment', v)}
            items={[{ label: 'ONLINE', value: 'ONLINE' }, { label: 'CASH', value: 'CASH' }]}
          />
        </FormField>

        <FormField label="Status">
          <FormPicker
            value={form.status}
            onValueChange={(v) => set('status', v)}
            items={[{ label: 'DONE', value: 'DONE' }, { label: 'PENDING', value: 'PENDING' }, { label: 'LOCKED', value: 'LOCKED' }]}
          />
        </FormField>

        <FormField label="Notes" isLast>
          <FormInput
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            numberOfLines={3}
            placeholder="Optional remarks"
          />
        </FormField>
      </Surface>

      {payment.payment_screenshot_path ? (
        <View style={styles.attachment}>
          <SectionHeader title="Attachment" />
          <Surface style={{ padding: 8 }}>
            <Image
              source={{ uri: `${API_BASE_URL}/static/${payment.payment_screenshot_path}` }}
              style={styles.screenshot}
              resizeMode="contain"
            />
          </Surface>
        </View>
      ) : null}

      <View style={styles.actions}>
        <FormButton title="Save Changes" onPress={submit} loading={loading} />
        <FormButton title="Delete Record" onPress={remove} tone="secondary" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  period: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  card: { padding: 20 },
  attachment: { marginTop: 24 },
  screenshot: { width: '100%', height: 300, borderRadius: 12 },
  actions: { marginTop: 32, gap: 12 },
});
