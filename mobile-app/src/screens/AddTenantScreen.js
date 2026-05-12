import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
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
const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const formatVehicles = (vehicles) => vehicles.map((v) => `${v.type}: ${v.reg}`).join(', ');

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
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ tenant_name: '', tenant_contact: '', tenant_photo_url: '', tenant_living_from: toIsoDate(new Date()) });

  const vehicleListValue = useMemo(() => formatVehicles(vehicles), [vehicles]);
  const tenantInitial = String(form.tenant_name || 'T').trim().charAt(0).toUpperCase() || 'T';
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

  const updateTenantPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) set('tenant_photo_url', uri);
  };

  const openAddVehicle = () => {
    setVehicleType('Car');
    setVehicleNumber('');
    setEditingVehicleIndex(null);
    setShowVehicleForm(true);
  };

  const openEditVehicle = (vehicle, idx) => {
    setVehicleType(vehicle.type || 'Car');
    setVehicleNumber(vehicle.reg || '');
    setEditingVehicleIndex(idx);
    setShowVehicleForm(true);
  };

  const saveVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return Alert.alert('Validation', 'Vehicle number is required.');
    setVehicles((prev) => {
      const next = [...prev];
      if (editingVehicleIndex === null) {
        next.push({ type: vehicleType, reg });
      } else {
        next[editingVehicleIndex] = { type: vehicleType, reg };
      }
      return next;
    });
    setVehicleNumber('');
    setEditingVehicleIndex(null);
    setShowVehicleForm(false);
  };

  const removeVehicle = (idx) => {
    Alert.alert('Delete vehicle', 'Remove this vehicle from tenant details?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setVehicles((prev) => prev.filter((_, i) => i !== idx));
        if (editingVehicleIndex === idx) {
          setEditingVehicleIndex(null);
          setShowVehicleForm(false);
          setVehicleNumber('');
        }
      } },
    ]);
  };

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Add Tenant</Text>
        <TouchableOpacity style={styles.avatar} onPress={updateTenantPhoto}>
          <Text style={styles.avatarText}>{tenantInitial}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}><Picker selectedValue={block} onValueChange={onChangeBlock}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
      <Text style={styles.label}>Flat</Text>
      <View style={styles.pickWrap}><Picker selectedValue={flat} onValueChange={onChangeFlat}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
      <Text style={styles.label}>Owner Name (Read only)</Text>
      <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{ownerName || 'No owner found'}</Text></View>

      <Text style={styles.label}>Tenant Name</Text>
      <TextInput style={styles.input} value={form.tenant_name} onChangeText={(v) => set('tenant_name', v)} />
      <Text style={styles.label}>Tenant Contact</Text>
      <TextInput style={styles.input} value={form.tenant_contact} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" showSoftInputOnFocus />
      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.tenant_living_from || 'Select date'}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.tenant_living_from)} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('tenant_living_from', toIsoDate(d)); setShowDate(false); }} />}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Vehicles</Text>
        <TouchableOpacity style={styles.plusBtn} onPress={openAddVehicle}><Text style={styles.plusTxt}>+</Text></TouchableOpacity>
      </View>
      {vehicles.length === 0 ? <Text style={styles.emptyText}>No vehicles added.</Text> : null}
      <View style={styles.vehicleList}>
        {vehicles.map((vehicle, idx) => (
          <TouchableOpacity key={`${vehicle.type}-${vehicle.reg}-${idx}`} style={styles.vehicleCard} onPress={() => openEditVehicle(vehicle, idx)}>
            <View>
              <Text style={styles.vehicleTitle}>{vehicle.type}</Text>
              <Text style={styles.vehicleMeta}>{vehicle.reg}</Text>
            </View>
            <TouchableOpacity style={styles.deleteMiniBtn} onPress={() => removeVehicle(idx)}>
              <Text style={styles.deleteMiniTxt}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
      {showVehicleForm && (
        <View style={styles.vehicleEditor}>
          <Text style={styles.label}>{editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'}</Text>
          <View style={styles.pickWrap}>
            <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
              {VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
            </Picker>
          </View>
          <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" />
          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.editorBtn} onPress={saveVehicle}><Text style={styles.editorBtnTxt}>Save Vehicle</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowVehicleForm(false); setEditingVehicleIndex(null); setVehicleNumber(''); }}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
          </View>
          {editingVehicleIndex !== null ? (
            <TouchableOpacity style={styles.vehicleDeleteBtn} onPress={() => removeVehicle(editingVehicleIndex)}>
              <Text style={styles.vehicleDeleteTxt}>Delete Vehicle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={submit}><Text style={styles.btnTxt}>Save Tenant</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#153d63' },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1f6fb2', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  readOnlyBox: { backgroundColor: '#eef3f8', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  readOnlyText: { color: '#2f7d50', textAlign: 'left', fontWeight: '700' },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 6 },
  sectionTitle: { color: '#153d63', fontWeight: '800', fontSize: 16 },
  plusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1f6fb2', alignItems: 'center', justifyContent: 'center' },
  plusTxt: { color: '#fff', fontWeight: '800', fontSize: 24, lineHeight: 28 },
  emptyText: { color: '#647d93', marginBottom: 6 },
  vehicleList: { gap: 8 },
  vehicleCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e3f0', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleTitle: { color: '#153d63', fontWeight: '800' },
  vehicleMeta: { color: '#647d93', marginTop: 2 },
  deleteMiniBtn: { backgroundColor: '#fff1f1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  deleteMiniTxt: { color: '#c53030', fontWeight: '700' },
  vehicleEditor: { backgroundColor: '#f7fafe', borderWidth: 1, borderColor: '#d8e3f0', borderRadius: 10, padding: 10, marginTop: 8 },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editorBtn: { flex: 1, backgroundColor: '#1f6fb2', borderRadius: 10, padding: 10 },
  editorBtnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bfd2e6', borderRadius: 10, padding: 10 },
  cancelTxt: { color: '#456480', textAlign: 'center', fontWeight: '700' },
  vehicleDeleteBtn: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 10, marginTop: 8 },
  vehicleDeleteTxt: { color: '#c53030', textAlign: 'center', fontWeight: '800' },
});
