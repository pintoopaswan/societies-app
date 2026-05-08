import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';

export default function TenantDetailsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId;
  const [showDate, setShowDate] = useState(false);
  const [vehicleInput, setVehicleInput] = useState('');
  const [form, setForm] = useState(null);

  const vehicles = useMemo(() => (form?.tenant_vehicle_list || '').split(',').map((s) => s.trim()).filter(Boolean), [form]);

  const load = useCallback(async () => {
    const res = await apiRequest(`/api/tenants/${propertyId}`);
    setForm(res.data);
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addVehicle = () => {
    const v = vehicleInput.trim();
    if (!v) return;
    const next = [...vehicles, v];
    set('tenant_vehicle_list', next.join(', '));
    setVehicleInput('');
  };
  const removeVehicle = (idx) => {
    const next = vehicles.filter((_, i) => i !== idx);
    set('tenant_vehicle_list', next.join(', '));
  };

  const save = async () => {
    try {
      await apiRequest(`/api/tenants/${propertyId}`, { method: 'PUT', body: JSON.stringify(form) }, token);
      Alert.alert('Saved', 'Tenant details updated');
      load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const del = async () => {
    Alert.alert('Delete tenant info', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiRequest(`/api/tenants/${propertyId}`, { method: 'DELETE' }, token);
        navigation.goBack();
      }},
    ]);
  };

  if (!form) return <Page><Text>Loading...</Text></Page>;

  return (
    <Page>
      <Text style={styles.title}>Tenant Details</Text>
      <Text style={styles.meta}>{form.block} | {form.flat}</Text>
      <Text style={styles.label}>Owner Name (Read only)</Text>
      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('OwnerDetails', { propertyId })}><Text style={styles.linkTxt}>{form.owner_name || 'Open Owner Details'}</Text></TouchableOpacity>
      <Text style={styles.label}>Name</Text><TextInput style={styles.input} value={form.tenant_name || ''} onChangeText={(v) => set('tenant_name', v)} />
      <Text style={styles.label}>Contact</Text><TextInput style={styles.input} value={form.tenant_contact || ''} onChangeText={(v) => set('tenant_contact', v)} />
      <Text style={styles.label}>Vehicles</Text>
      <View style={styles.vehicleRow}><TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={vehicleInput} onChangeText={setVehicleInput} placeholder="e.g. KA01AB1234" /><TouchableOpacity style={styles.addBtn} onPress={addVehicle}><Text style={styles.addTxt}>Add</Text></TouchableOpacity></View>
      <View style={styles.chipWrap}>{vehicles.map((v, i) => <TouchableOpacity key={`${v}-${i}`} style={styles.chip} onPress={() => removeVehicle(i)}><Text style={styles.chipTxt}>{v} ×</Text></TouchableOpacity>)}</View>
      <Text style={styles.label}>Photo URL</Text><TextInput style={styles.input} value={form.tenant_photo_url || ''} onChangeText={(v) => set('tenant_photo_url', v)} />
      {!!(form.tenant_photo_url || '').trim() && <Image source={{ uri: form.tenant_photo_url }} style={styles.photo} />}
      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.tenant_living_from || 'Select date'}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.tenant_living_from || toIsoDate(new Date()))} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('tenant_living_from', toIsoDate(d)); setShowDate(false); }} />}
      <Text style={styles.tableTitle}>Guard Payment Details (Payment History)</Text>
      <View>
        <View style={[styles.tr, styles.thRow]}><Text style={[styles.td, styles.th]}>Month</Text><Text style={[styles.td, styles.th]}>Amount</Text><Text style={[styles.td, styles.th]}>Date</Text><Text style={[styles.td, styles.th]}>Mode</Text></View>
        {(form.payment_history || []).map((item, idx) => (
          <View key={`${item.year}-${item.month}-${idx}`} style={styles.tr}>
            <Text style={styles.td}>{MONTH_NAMES[(item.month || 1) - 1]} {item.year}</Text>
            <Text style={styles.td}>Rs {Math.round(item.amount || 0)}</Text>
            <Text style={styles.td}>{item.payment_date || '-'}</Text>
            <Text style={styles.td}>{item.mode_of_payment || '-'}</Text>
          </View>
        ))}
      </View>
      {!!(form.tenant_photo_url || '').trim() && <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(form.tenant_photo_url)}><Text style={styles.linkTxt}>Open Photo</Text></TouchableOpacity>}
      <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity>
      <TouchableOpacity style={styles.delBtn} onPress={del}><Text style={styles.delTxt}>Delete</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#153d63' },
  meta: { color: '#647d93', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10 },
  photo: { width: 140, height: 140, borderRadius: 10, marginTop: 8, backgroundColor: '#e8edf4' },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  delBtn: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 10, marginTop: 8 },
  delTxt: { color: '#c53030', textAlign: 'center', fontWeight: '700' },
  linkBtn: { backgroundColor: '#eaf8ef', borderRadius: 10, padding: 10, marginTop: 8 },
  linkTxt: { color: '#2f7d50', textAlign: 'center', fontWeight: '700' },
  vehicleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  addBtn: { backgroundColor: '#1f6fb2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addTxt: { color: '#fff', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: '#e8f1ff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipTxt: { color: '#1f6fb2', fontWeight: '700' },
  tableTitle: { color: '#153d63', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  tr: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5edf6' },
  thRow: { backgroundColor: '#eef4fb' },
  td: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, color: '#5a7087', fontSize: 12 },
  th: { color: '#153d63', fontWeight: '700' },
});
