import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';

const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const parseVehicleList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [type, ...rest] = item.split(':').map((part) => part.trim());
    const reg = rest.join(':').trim();
    return VEHICLE_TYPES.includes(type) ? { type, reg } : { type: 'Car', reg: item };
  });

export default function TenantDetailsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId;
  const [showDate, setShowDate] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [form, setForm] = useState(null);

  const vehicles = useMemo(() => parseVehicleList(form?.tenant_vehicle_list || ''), [form?.tenant_vehicle_list]);

  const load = useCallback(async () => {
    const res = await apiRequest(`/api/tenants/${propertyId}`);
    setForm(res.data);
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return;
    const next = [...vehicles, { type: vehicleType, reg }];
    set('tenant_vehicle_list', next.map((v) => `${v.type}: ${v.reg}`).join(', '));
    setVehicleNumber('');
  };
  const removeVehicle = (idx) => {
    const next = vehicles.filter((_, i) => i !== idx);
    set('tenant_vehicle_list', next.map((v) => `${v.type}: ${v.reg}`).join(', '));
  };

  const save = async () => {
    if (!form.tenant_name?.trim()) return Alert.alert('Validation', 'Tenant Name is required.');
    if (!form.tenant_contact?.trim()) return Alert.alert('Validation', 'Tenant Contact is required.');
    if (!/^[0-9]{10}$/.test(String(form.tenant_contact).trim())) return Alert.alert('Validation', 'Tenant Contact must be 10 digits.');
    if (!form.tenant_living_from) return Alert.alert('Validation', 'Living From date is required.');
    try {
      await apiRequest(`/api/tenants/${propertyId}`, { method: 'PUT', body: JSON.stringify({
        ...form,
        tenant_vehicle_list: vehicles.map((v) => `${v.type}: ${v.reg}`).join(', '),
      }) }, token);
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
      <Text style={styles.label}>Contact</Text><TextInput style={styles.input} value={form.tenant_contact || ''} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" showSoftInputOnFocus />
      <Text style={styles.label}>Vehicle Type</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={vehicleType} onValueChange={(v) => setVehicleType(v)}>
          {VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Vehicle Number</Text>
      <View style={styles.vehicleRow}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" />
        <TouchableOpacity style={styles.addBtn} onPress={addVehicle}><Text style={styles.addTxt}>Add</Text></TouchableOpacity>
      </View>
      <View style={styles.chipWrap}>{vehicles.map((v, i) => <TouchableOpacity key={`${v.type}-${v.reg}-${i}`} style={styles.chip} onPress={() => removeVehicle(i)}><Text style={styles.chipTxt}>{v.type}: {v.reg} ×</Text></TouchableOpacity>)}</View>
      <TouchableOpacity style={styles.photoBtn} onPress={async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
        if (result.canceled) return;
        const uri = result.assets?.[0]?.uri;
        if (uri) set('tenant_photo_url', uri);
      }}>
        <Text style={styles.photoBtnText}>Update Photo</Text>
      </TouchableOpacity>
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
