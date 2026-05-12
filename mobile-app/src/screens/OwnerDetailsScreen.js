import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function OwnerDetailsScreen() {
  const { token, user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId;
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    const res = await apiRequest(`/api/owners/${propertyId}`);
    setForm(res.data);
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.owner_name?.trim()) return Alert.alert('Validation', 'Owner Name is required.');
    if (!form.owner_contact?.trim()) return Alert.alert('Validation', 'Owner Contact is required.');
    if (!/^[0-9]{10}$/.test(String(form.owner_contact).trim())) return Alert.alert('Validation', 'Owner Contact must be 10 digits.');
    try {
      const payload = { ...form };
      delete payload.tenant_name;
      await apiRequest(`/api/owners/${propertyId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      Alert.alert('Saved', 'Owner details updated');
      load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const del = async () => {
    Alert.alert('Delete record', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiRequest(`/api/owners/${propertyId}`, { method: 'DELETE' }, token);
        navigation.goBack();
      }},
    ]);
  };

  if (!form) return <Page><Text>Loading...</Text></Page>;

  return (
    <Page>
      <Text style={styles.title}>Flat Details</Text>
      <Text style={styles.meta}>{form.block} | {form.flat}</Text>
      <Text style={styles.label}>Owner Name</Text><TextInput style={styles.input} value={form.owner_name || ''} onChangeText={(v) => set('owner_name', v)} />
      <Text style={styles.label}>Owner Contact</Text><TextInput style={styles.input} value={form.owner_contact || ''} onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" showSoftInputOnFocus />
      <Text style={styles.label}>Occupied</Text><View style={styles.pickWrap}><Picker selectedValue={String(form.is_occupied ? 1 : 0)} onValueChange={(v) => set('is_occupied', Number(v))}><Picker.Item label="No" value="0" /><Picker.Item label="Yes" value="1" /></Picker></View>
      <Text style={styles.label}>Occupied By</Text><View style={styles.pickWrap}><Picker selectedValue={form.occupied_by || 'OWNER'} onValueChange={(v) => set('occupied_by', v)}><Picker.Item label="OWNER" value="OWNER" /><Picker.Item label="TENANT" value="TENANT" /></Picker></View>
      <Text style={styles.label}>Tenant Name</Text>
      {!!(form.tenant_name || '').trim()
        ? <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('TenantDetails', { propertyId })}><Text style={styles.linkTxt}>{form.tenant_name}</Text></TouchableOpacity>
        : canManage ? <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('AddTenant', { propertyId, block: form.block, owner_name: form.owner_name || '' })}><Text style={styles.linkTxt}>Add Tenant</Text></TouchableOpacity> : <Text style={styles.meta}>No tenant linked.</Text>
      }
      {canManage ? <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity> : null}
      {canManage ? <TouchableOpacity style={styles.delBtn} onPress={del}><Text style={styles.delTxt}>Delete</Text></TouchableOpacity> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#153d63' },
  meta: { color: '#647d93', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10 },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  delBtn: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 10, marginTop: 8 },
  delTxt: { color: '#c53030', textAlign: 'center', fontWeight: '700' },
  linkBtn: { backgroundColor: '#e8f1ff', borderRadius: 10, padding: 10, marginTop: 8 },
  linkTxt: { color: '#1f6fb2', textAlign: 'center', fontWeight: '700' },
});
