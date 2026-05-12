import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { toIsoDate, safeDateFromIso } from '../lib/date';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { registerRequest } = useAuth();

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    block: BLOCKS[0],
    flat: FLATS[0],
    living_from: toIsoDate(new Date()),
  });
  const [rentDocument, setRentDocument] = useState(null);
  const [idCardDocument, setIdCardDocument] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickDoc = async (setter) => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled) return;
    setter(res.assets?.[0] || null);
  };

  const onSubmit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    if (!form.mobile.trim()) return Alert.alert('Validation', 'Mobile Number is required.');
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) return Alert.alert('Validation', 'Mobile Number must be 10 digits.');
    if (!form.email.trim()) return Alert.alert('Validation', 'Email ID is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return Alert.alert('Validation', 'Email ID is invalid.');
    if (!form.password.trim()) return Alert.alert('Validation', 'Password is required.');
    if (!form.confirmPassword.trim()) return Alert.alert('Validation', 'Re-enter Password is required.');
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Password and re-entered password must match.');
      return;
    }

    try {
      setLoading(true);
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, String(v || '')));
      if (rentDocument?.uri) body.append('rent_document', { uri: rentDocument.uri, name: rentDocument.name || 'rent-document.pdf', type: rentDocument.mimeType || 'application/octet-stream' });
      if (idCardDocument?.uri) body.append('id_card_document', { uri: idCardDocument.uri, name: idCardDocument.name || 'id-card-document.pdf', type: idCardDocument.mimeType || 'application/octet-stream' });

      await registerRequest(body);
      Alert.alert('Request submitted', 'Registration request sent to admin for approval.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Unable to submit', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => set('name', v)} />
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        value={form.mobile}
        onChangeText={(v) => set('mobile', v.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Email ID"
        value={form.email}
        onChangeText={(v) => set('email', v)}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput style={styles.input} placeholder="Password" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
      <TextInput style={styles.input} placeholder="Re-enter Password" value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secureTextEntry />

      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}><Picker selectedValue={form.block} onValueChange={(v) => set('block', v)}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>

      <Text style={styles.label}>Flat</Text>
      <View style={styles.pickWrap}><Picker selectedValue={form.flat} onValueChange={(v) => set('flat', v)}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>

      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.living_from}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.living_from)} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('living_from', toIsoDate(d)); setShowDate(false); }} />}

      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDoc(setRentDocument)}>
        <Text style={styles.uploadTxt}>{rentDocument?.name ? `Rent/Registry: ${rentDocument.name}` : 'Upload Rent Agreement / Registry'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.uploadBtn} onPress={() => pickDoc(setIdCardDocument)}>
        <Text style={styles.uploadTxt}>{idCardDocument?.name ? `ID Card: ${idCardDocument.name}` : 'Upload ID Card (Aadhaar)'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Request'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f7fb' },
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700' },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  uploadBtn: { backgroundColor: '#eaf3ff', borderColor: '#bfd5ef', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  uploadTxt: { color: '#1f6fb2', fontWeight: '700' },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
