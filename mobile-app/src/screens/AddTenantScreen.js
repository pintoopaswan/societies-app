import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { safeDateFromIso, toIsoDate } from '../lib/date';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);
const VEHICLE_TYPES = ['Car', 'Bike', 'Scooty'];

export default function AddTenantScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [showDate, setShowDate] = useState(false);
  const [block, setBlock] = useState(route.params?.block || 'Block-1');
  const [flat, setFlat] = useState(route.params?.flat || '101');
  const [ownerName, setOwnerName] = useState(route.params?.owner_name || '');
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ tenant_name: '', tenant_contact: '', tenant_photo_url: '', tenant_living_from: toIsoDate(new Date()) });

  const vehicleListValue = useMemo(() => vehicles.map((v) => `${v.type}: ${v.reg}`).join(', '), [vehicles]);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const lookupOwner = async (b, f) => {
    try {
      const res = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(b)}&flat=${encodeURIComponent(f)}`);
      setOwnerName(res.data?.owner_name || route.params?.owner_name || '');
    } catch {
      setOwnerName(route.params?.owner_name || '');
    }
  };

  const onChangeBlock = (v) => {
    setBlock(v);
    lookupOwner(v, flat);
  };
  const onChangeFlat = (v) => {
    setFlat(v);
    lookupOwner(block, v);
  };

  useEffect(() => {
    lookupOwner(block, flat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return;
    setVehicles((p) => [...p, { type: vehicleType, reg }]);
    setVehicleNumber('');
  };
  const removeVehicle = (idx) => setVehicles((p) => p.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!block) return Alert.alert('Validation', 'Block is required.');
    if (!flat) return Alert.alert('Validation', 'Flat is required.');
    if (!form.tenant_name.trim()) return Alert.alert('Validation', 'Tenant Name is required.');
    if (!form.tenant_contact.trim()) return Alert.alert('Validation', 'Tenant Contact is required.');
    if (!/^[0-9]{10}$/.test(form.tenant_contact.trim())) return Alert.alert('Validation', 'Tenant Contact must be 10 digits.');
    if (!form.tenant_living_from) return Alert.alert('Validation', 'Living From date is required.');
    try {
      const res = await apiRequest('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({
          block,
          flat,
          ...form,
          tenant_vehicle_list: vehicleListValue,
        }),
      }, token);
      navigation.navigate('TenantDetails', { propertyId: res.property_id });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Page>
      <Text style={styles.title}>Add Tenant</Text>
      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}><Picker selectedValue={block} onValueChange={onChangeBlock}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
      <Text style={styles.label}>Flat</Text>
      <View style={styles.pickWrap}><Picker selectedValue={flat} onValueChange={onChangeFlat}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
      <Text style={styles.label}>Owner Name (Read only)</Text><TextInput style={[styles.input, styles.readOnly]} editable={false} value={ownerName} />
      <Text style={styles.label}>Tenant Name</Text><TextInput style={styles.input} value={form.tenant_name} onChangeText={(v) => set('tenant_name', v)} />
      <Text style={styles.label}>Tenant Contact</Text><TextInput style={styles.input} value={form.tenant_contact} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" showSoftInputOnFocus />
      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.tenant_living_from || 'Select date'}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.tenant_living_from)} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('tenant_living_from', toIsoDate(d)); setShowDate(false); }} />}
      <Text style={styles.label}>Vehicle Type</Text>
      <View style={styles.pickWrap}><Picker selectedValue={vehicleType} onValueChange={setVehicleType}>{VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}</Picker></View>
      <Text style={styles.label}>Registration Number</Text>
      <View style={styles.vehicleRow}><TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" /><TouchableOpacity style={styles.addBtn} onPress={addVehicle}><Text style={styles.addTxt}>Add</Text></TouchableOpacity></View>
      <View style={styles.chipWrap}>{vehicles.map((v, i) => <TouchableOpacity key={`${v.type}-${v.reg}-${i}`} style={styles.chip} onPress={() => removeVehicle(i)}><Text style={styles.chipTxt}>{v.type}: {v.reg} ×</Text></TouchableOpacity>)}</View>
      <Text style={styles.label}>Photo URL</Text><TextInput style={styles.input} value={form.tenant_photo_url} onChangeText={(v) => set('tenant_photo_url', v)} />
      <TouchableOpacity style={styles.btn} onPress={submit}><Text style={styles.btnTxt}>Save Tenant</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  readOnly: { backgroundColor: '#eef3f8' },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 8 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  vehicleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  addBtn: { backgroundColor: '#1f6fb2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addTxt: { color: '#fff', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { backgroundColor: '#e8f1ff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipTxt: { color: '#1f6fb2', fontWeight: '700' },
});
