import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { safeDateFromIso, toIsoDate } from '../lib/date';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 6 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

function PickerField({ label, value, onChange, items, borderColor }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerBox, { borderColor }]}>
        <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
          {items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} />)}
        </Picker>
      </View>
    </View>
  );
}

export default function NewPaymentScreen({ navigation }) {
  const { token } = useAuth();
  const today = new Date();
  const [form, setForm] = useState({
    block: 'Block-1',
    flat: '101',
    amount: '',
    payment_date: toIsoDate(today),
    mode_of_payment: 'ONLINE',
    received_by: '',
    notes: '',
  });
  const [showDate, setShowDate] = useState(false);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const valid = useMemo(() => form.block && form.flat && Number(form.amount) > 0 && form.payment_date && form.mode_of_payment, [form]);

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
    try {
      await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ ...form, year, month, amount: Number(form.amount) }),
      }, token);
      navigation.navigate('Payments', { preset: { scope: 'month', year, month }, ts: Date.now() });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Page>
      <Text style={styles.title}>Add Payment</Text>
      <PickerField label="Block*" value={form.block} onChange={(v) => set('block', v)} borderColor="#4f81c8" items={BLOCKS.map((b) => ({ label: b, value: b }))} />
      <PickerField label="Flat*" value={form.flat} onChange={(v) => set('flat', v)} borderColor="#f09a45" items={FLATS.map((f) => ({ label: f, value: f }))} />

      <Text style={styles.label}>Amount*</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} />

      <Text style={styles.label}>Payment Date*</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.payment_date}</Text></TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={safeDateFromIso(form.payment_date)}
          mode="date"
          display="default"
          onChange={(event, d) => {
            if (event.type === 'dismissed') {
              setShowDate(false);
              return;
            }
            if (d) set('payment_date', toIsoDate(d));
            setShowDate(false);
          }}
        />
      )}

      <PickerField
        label="Payment Mode*"
        value={form.mode_of_payment}
        onChange={(v) => set('mode_of_payment', v)}
        borderColor="#58ad77"
        items={[{ label: 'ONLINE', value: 'ONLINE' }, { label: 'CASH', value: 'CASH' }]}
      />

      <Text style={styles.label}>Received By</Text>
      <TextInput style={styles.input} value={form.received_by} onChangeText={(v) => set('received_by', v)} />
      <Text style={styles.label}>Notes</Text>
      <TextInput style={styles.input} value={form.notes} onChangeText={(v) => set('notes', v)} multiline />

      <TouchableOpacity style={[styles.button, !valid && styles.btnDisabled]} onPress={submit} disabled={!valid}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  fieldWrap: { marginTop: 6 },
  label: { color: '#5e738b', fontWeight: '700', marginTop: 8 },
  pickerBox: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, marginTop: 4 },
  picker: { height: 48 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#d4dfeb', padding: 11, marginTop: 4 },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10, marginTop: 12 },
  btnDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '800' },
});
