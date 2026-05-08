import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';

function PickerBox({ value, onChange, items, borderColor }) {
  return <View style={[styles.pickerBox, { borderColor }]}><Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>{items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} />)}</Picker></View>;
}

export default function EditPaymentScreen({ route, navigation }) {
  const { token } = useAuth();
  const { payment, onSaved } = route.params;
  const [showDate, setShowDate] = useState(false);
  const [form, setForm] = useState({ amount: String(payment.amount || ''), payment_date: payment.payment_date || toIsoDate(new Date()), mode_of_payment: payment.mode_of_payment || 'ONLINE', received_by: '', status: payment.status || 'DONE', notes: payment.notes || '' });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!Number(form.amount) || Number(form.amount) <= 0) return Alert.alert('Validation', 'Amount must be greater than 0');
    if (!form.payment_date) return Alert.alert('Validation', 'Payment date is required');
    try {
      await apiRequest(`/api/payments/${payment.property_id}/${payment.year}/${payment.month}`, { method: 'PUT', body: JSON.stringify({ ...form, amount: Number(form.amount) }) }, token);
      onSaved?.();
      navigation.goBack();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const del = async () => {
    Alert.alert('Delete payment', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await apiRequest(`/api/payments/${payment.property_id}/${payment.year}/${payment.month}`, { method: 'DELETE' }, token); onSaved?.(); navigation.goBack(); } catch (e) { Alert.alert('Error', e.message); } } }]);
  };

  return (
    <Page>
      <Text style={styles.title}>Payment Details</Text>
      <Text style={styles.meta}>{payment.block} | {payment.flat} | {MONTH_NAMES[(payment.month || 1) - 1]} {payment.year}</Text>
      {!!(payment.tenant_name || '').trim() && <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('TenantDetails', { propertyId: payment.property_id })}><Text style={styles.linkTxt}>Tenant: {payment.tenant_name}</Text></TouchableOpacity>}
      <Text style={styles.label}>Amount</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} />
      <Text style={styles.label}>Payment Date</Text><TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.payment_date || 'Select date'}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.payment_date)} mode="date" display="default" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('payment_date', toIsoDate(d)); setShowDate(false); }} />}
      <Text style={styles.label}>Mode of Payment</Text><PickerBox value={form.mode_of_payment} onChange={(v) => set('mode_of_payment', v)} borderColor="#58ad77" items={[{ label: 'ONLINE', value: 'ONLINE' }, { label: 'CASH', value: 'CASH' }]} />
      <Text style={styles.label}>Received By</Text><TextInput style={styles.input} value={form.received_by} onChangeText={(v) => set('received_by', v)} />
      <Text style={styles.label}>Status</Text><PickerBox value={form.status} onChange={(v) => set('status', v)} borderColor="#f09a45" items={[{ label: 'DONE', value: 'DONE' }, { label: 'PENDING', value: 'PENDING' }, { label: 'LOCKED', value: 'LOCKED' }]} />
      <Text style={styles.label}>Notes</Text><TextInput style={styles.input} value={form.notes} onChangeText={(v) => set('notes', v)} multiline />
      <TouchableOpacity style={styles.button} onPress={save}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
      <TouchableOpacity style={styles.delete} onPress={del}><Text style={styles.deleteText}>Delete Payment</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63' },
  meta: { color: '#5f7489', marginBottom: 8 },
  label: { color: '#5e738b', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#d4dfeb', padding: 11, marginTop: 4 },
  pickerBox: { backgroundColor: '#f7fafe', borderRadius: 10, borderWidth: 2, marginTop: 4 },
  picker: { height: 48 },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10, marginTop: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '800' },
  delete: { backgroundColor: '#fff1f1', padding: 12, borderRadius: 10, marginTop: 10 },
  deleteText: { color: '#c53030', textAlign: 'center', fontWeight: '800' },
  linkBtn: { backgroundColor: '#e8f1ff', borderRadius: 10, padding: 10, marginBottom: 6 },
  linkTxt: { color: '#1f6fb2', textAlign: 'center', fontWeight: '700' },
});
