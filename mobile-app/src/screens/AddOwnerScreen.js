import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 8 }, (_, i) => String(101 + i));

export default function AddOwnerScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [form, setForm] = useState({
    block: BLOCKS[0],
    flat: FLATS[0],
    owner_name: '',
    owner_contact: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.block) return Alert.alert('Validation', 'Block is required.');
    if (!form.flat) return Alert.alert('Validation', 'Flat is required.');
    if (!form.owner_name.trim()) return Alert.alert('Validation', 'Owner Name is required.');
    if (!form.owner_contact.trim()) return Alert.alert('Validation', 'Owner Contact is required.');
    if (!/^[0-9]{10}$/.test(form.owner_contact.trim())) return Alert.alert('Validation', 'Owner Contact must be 10 digits.');
    setSaving(true);
    try {
      const lookup = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(form.block)}&flat=${encodeURIComponent(form.flat)}`);
      const propertyId = lookup.data?.property_id;
      if (!propertyId) {
        Alert.alert('Not found', 'Selected block/flat does not exist in properties.');
        return;
      }
      await apiRequest(
        `/api/owners/${propertyId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            owner_name: form.owner_name.trim(),
            owner_contact: form.owner_contact.trim(),
            is_occupied: 1,
            occupied_by: 'OWNER',
          }),
        },
        token,
      );
      Alert.alert('Saved', 'Owner details saved successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Text style={styles.title}>Add Owner</Text>
      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={form.block} onValueChange={(v) => set('block', v)}>
          {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Flat</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={form.flat} onValueChange={(v) => set('flat', v)}>
          {FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Owner Name</Text>
      <TextInput style={styles.input} value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="Enter owner name" />
      <Text style={styles.label}>Owner Contact</Text>
      <TextInput
        style={styles.input}
        value={form.owner_contact}
        onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
        placeholder="Enter owner contact"
        keyboardType="number-pad"
        inputMode="numeric"
        showSoftInputOnFocus
      />
      <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
        <Text style={styles.btnTxt}>{saving ? 'Saving...' : 'Save Owner'}</Text>
      </TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
