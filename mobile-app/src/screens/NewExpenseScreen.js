import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { API_BASE_URL } from '../lib/config';
import { safeDateFromIso, toIsoDate } from '../lib/date';

export default function NewExpenseScreen({ navigation, route }) {
  const { token } = useAuth();
  const [showDate, setShowDate] = useState(false);
  const [form, setForm] = useState({ transaction_date: toIsoDate(new Date()), item_name: '', quantity: '', amount: '', payment_mode: 'ONLINE', paid_by: '' });
  const [bill, setBill] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickBill = async () => {
    Alert.alert('Upload Bill', 'Choose source', [
      { text: 'Camera', onPress: async () => { const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: 'bill.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); }},
      { text: 'Gallery', onPress: async () => { const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: 'bill.jpg', type: r.assets[0].mimeType || 'image/jpeg' }); }},
      { text: 'PDF/File', onPress: async () => { const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true }); if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: r.assets[0].name || 'bill.pdf', type: r.assets[0].mimeType || 'application/pdf' }); }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!form.transaction_date || !form.item_name.trim() || !form.amount || Number(form.amount) <= 0 || !form.payment_mode) return Alert.alert('Validation', 'Date, item name, amount, and payment mode are required.');
    try {
      const body = new FormData();
      Object.entries({ ...form, amount: Number(form.amount) }).forEach(([k, v]) => body.append(k, String(v ?? '')));
      if (bill) body.append('bill', bill);
      const res = await fetch(`${API_BASE_URL}/api/expenses`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      route.params?.onSaved?.();
      navigation.navigate('Expenses');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Page>
      <Text style={styles.title}>Add Expense</Text>
      <Text style={styles.label}>Date*</Text><TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.transaction_date}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.transaction_date)} mode="date" display="default" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('transaction_date', toIsoDate(d)); setShowDate(false); }} />}
      <Text style={styles.label}>Item Name*</Text><TextInput style={styles.input} value={form.item_name} onChangeText={(v) => set('item_name', v)} />
      <Text style={styles.label}>Quantity</Text><TextInput style={styles.input} value={form.quantity} onChangeText={(v) => set('quantity', v)} />
      <Text style={styles.label}>Amount*</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={form.amount} onChangeText={(v) => set('amount', v)} />
      <Text style={styles.label}>Payment Mode*</Text><TextInput style={styles.input} value={form.payment_mode} onChangeText={(v) => set('payment_mode', v.toUpperCase())} placeholder="CASH or ONLINE" />
      <Text style={styles.label}>Paid By</Text><TextInput style={styles.input} value={form.paid_by} onChangeText={(v) => set('paid_by', v)} />
      {bill?.uri && <Image source={{ uri: bill.uri }} style={styles.bill} />}
      <TouchableOpacity style={styles.secondary} onPress={pickBill}><Text style={styles.secondaryText}>Pick Bill Image/PDF (Optional)</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Save</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  label: { color: '#5e738b', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#d4dfeb', padding: 11, marginTop: 4 },
  bill: { width: '100%', height: 180, borderRadius: 8, marginTop: 10, backgroundColor: '#e9eef5' },
  secondary: { backgroundColor: '#fff', borderColor: '#1f6fb2', borderWidth: 1, padding: 10, borderRadius: 10, marginTop: 10 },
  secondaryText: { color: '#1f6fb2', textAlign: 'center', fontWeight: '700' },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10, marginTop: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '800' },
});
