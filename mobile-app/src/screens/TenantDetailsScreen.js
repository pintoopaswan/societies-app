import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

const formatVehicles = (vehicles) => vehicles.map((v) => `${v.type}: ${v.reg}`).join(', ');

export default function TenantDetailsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId;
  const readOnly = !!route.params?.readOnly;
  const snapshot = route.params?.snapshot || null;
  const [showDate, setShowDate] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [form, setForm] = useState(null);

  const vehicles = useMemo(() => parseVehicleList(form?.tenant_vehicle_list || ''), [form?.tenant_vehicle_list]);
  const tenantInitial = String(form?.tenant_name || 'T').trim().charAt(0).toUpperCase() || 'T';

  const load = useCallback(async () => {
    if (snapshot) {
      let paymentHistory = snapshot.payment_history || [];
      if (propertyId) {
        try {
          const tenantRes = await apiRequest(`/api/tenants/${propertyId}`);
          paymentHistory = tenantRes.data?.payment_history || paymentHistory;
        } catch {
          // Keep rendering read-only snapshot data even if the supplemental history request fails.
        }
      }
      setForm({
        property_id: propertyId,
        block: snapshot.block || '',
        flat: snapshot.flat || '',
        owner_name: snapshot.owner_name || '',
        owner_contact: snapshot.owner_contact || '',
        tenant_name: snapshot.tenant_name || '',
        tenant_contact: snapshot.tenant_contact || '',
        tenant_vehicle_list: snapshot.tenant_vehicle_list || '',
        tenant_photo_url: snapshot.tenant_photo_url || '',
        tenant_living_from: snapshot.tenant_living_from || '',
        tenant_guard_payment_details: snapshot.tenant_guard_payment_details || '',
        payment_history: paymentHistory,
      });
      return;
    }
    const res = await apiRequest(`/api/tenants/${propertyId}`);
    setForm(res.data);
  }, [propertyId, snapshot]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const updateVehicleList = (next) => set('tenant_vehicle_list', formatVehicles(next));

  const openAddVehicle = () => {
    if (readOnly) return;
    setVehicleType('Car');
    setVehicleNumber('');
    setEditingVehicleIndex(null);
    setShowVehicleForm(true);
  };

  const openEditVehicle = (vehicle, idx) => {
    if (readOnly) return;
    setVehicleType(vehicle.type || 'Car');
    setVehicleNumber(vehicle.reg || '');
    setEditingVehicleIndex(idx);
    setShowVehicleForm(true);
  };

  const saveVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return Alert.alert('Validation', 'Vehicle number is required.');
    const next = [...vehicles];
    if (editingVehicleIndex === null) {
      next.push({ type: vehicleType, reg });
    } else {
      next[editingVehicleIndex] = { type: vehicleType, reg };
    }
    updateVehicleList(next);
    setVehicleNumber('');
    setEditingVehicleIndex(null);
    setShowVehicleForm(false);
  };

  const removeVehicle = (idx) => {
    if (readOnly) return;
    Alert.alert('Delete vehicle', 'Remove this vehicle from tenant details?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        updateVehicleList(vehicles.filter((_, i) => i !== idx));
        if (editingVehicleIndex === idx) {
          setEditingVehicleIndex(null);
          setShowVehicleForm(false);
          setVehicleNumber('');
        }
      } },
    ]);
  };

  const updateTenantPhoto = async () => {
    if (readOnly) return;
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

  const save = async () => {
    if (!form.tenant_name?.trim()) return Alert.alert('Validation', 'Tenant Name is required.');
    if (!form.tenant_contact?.trim()) return Alert.alert('Validation', 'Tenant Contact is required.');
    if (!/^[0-9]{10}$/.test(String(form.tenant_contact).trim())) return Alert.alert('Validation', 'Tenant Contact must be 10 digits.');
    if (!form.tenant_living_from) return Alert.alert('Validation', 'Living From date is required.');
    try {
      await apiRequest(`/api/tenants/${propertyId}`, { method: 'PUT', body: JSON.stringify({
        ...form,
        tenant_vehicle_list: formatVehicles(vehicles),
      }) }, token);
      Alert.alert('Saved', 'Tenant details updated');
      navigation.navigate('TenantsList', { priorityPropertyId: propertyId });
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const del = async () => {
    Alert.alert('Delete tenant info', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiRequest(`/api/tenants/${propertyId}`, { method: 'DELETE' }, token);
        navigation.goBack();
      } },
    ]);
  };

  if (!form) return <Page><Text>Loading...</Text></Page>;

  return (
    <Page>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Tenant Details</Text>
          <Text style={styles.meta}>{form.block} | {form.flat}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={updateTenantPhoto} disabled={readOnly}>
          <Text style={styles.avatarText}>{tenantInitial}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Owner Name (Read only)</Text>
      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('OwnerDetails', { propertyId })} disabled={!propertyId}>
        <Text style={styles.linkTxt}>{form.owner_name || 'Open Owner Details'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Name</Text>
      <TextInput style={[styles.input, readOnly && styles.readOnlyInput]} editable={!readOnly} value={form.tenant_name || ''} onChangeText={(v) => set('tenant_name', v)} />
      <Text style={styles.label}>Contact</Text>
      <TextInput style={[styles.input, readOnly && styles.readOnlyInput]} editable={!readOnly} value={form.tenant_contact || ''} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" inputMode="numeric" showSoftInputOnFocus />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Vehicles</Text>
        {!readOnly ? <TouchableOpacity style={styles.plusBtn} onPress={openAddVehicle}><Text style={styles.plusTxt}>+</Text></TouchableOpacity> : null}
      </View>
      {vehicles.length === 0 ? <Text style={styles.emptyText}>No vehicles added.</Text> : null}
      <View style={styles.vehicleList}>
        {vehicles.map((vehicle, idx) => (
          <TouchableOpacity key={`${vehicle.type}-${vehicle.reg}-${idx}`} style={styles.vehicleCard} onPress={() => openEditVehicle(vehicle, idx)} disabled={readOnly}>
            <View>
              <Text style={styles.vehicleTitle}>{vehicle.type}</Text>
              <Text style={styles.vehicleMeta}>{vehicle.reg}</Text>
            </View>
            {!readOnly ? <TouchableOpacity style={styles.deleteMiniBtn} onPress={() => removeVehicle(idx)}>
              <Text style={styles.deleteMiniTxt}>Delete</Text>
            </TouchableOpacity> : null}
          </TouchableOpacity>
        ))}
      </View>
      {!readOnly && showVehicleForm && (
        <View style={styles.vehicleEditor}>
          <Text style={styles.label}>{editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'}</Text>
          <View style={styles.pickWrap}>
            <Picker selectedValue={vehicleType} onValueChange={(v) => setVehicleType(v)}>
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

      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={[styles.input, readOnly && styles.readOnlyInput]} onPress={() => setShowDate(true)} disabled={readOnly}><Text>{form.tenant_living_from || 'Select date'}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.tenant_living_from || toIsoDate(new Date()))} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) set('tenant_living_from', toIsoDate(d)); setShowDate(false); }} />}

      {(form.payment_history || []).length > 0 ? (
        <>
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
        </>
      ) : null}

      {!readOnly ? <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnTxt}>Save</Text></TouchableOpacity> : null}
      {!readOnly ? <TouchableOpacity style={styles.delBtn} onPress={del}><Text style={styles.delTxt}>Delete</Text></TouchableOpacity> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#172b31' },
  meta: { color: '#647d93', marginTop: 2 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#20343a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10 },
  readOnlyInput: { backgroundColor: '#eef3f8' },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginTop: 4 },
  btn: { backgroundColor: '#20343a', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  delBtn: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 10, marginTop: 8 },
  delTxt: { color: '#c53030', textAlign: 'center', fontWeight: '700' },
  linkBtn: { backgroundColor: '#eaf8ef', borderRadius: 10, padding: 10, marginTop: 8 },
  linkTxt: { color: '#2f7d50', textAlign: 'left', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  sectionTitle: { color: '#172b31', fontWeight: '800', fontSize: 16 },
  plusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#20343a', alignItems: 'center', justifyContent: 'center' },
  plusTxt: { color: '#fff', fontWeight: '800', fontSize: 24, lineHeight: 28 },
  emptyText: { color: '#647d93', marginBottom: 6 },
  vehicleList: { gap: 8 },
  vehicleCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e0d8', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleTitle: { color: '#172b31', fontWeight: '800' },
  vehicleMeta: { color: '#647d93', marginTop: 2 },
  deleteMiniBtn: { backgroundColor: '#fff1f1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  deleteMiniTxt: { color: '#c53030', fontWeight: '700' },
  vehicleEditor: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e0d8', borderRadius: 10, padding: 10, marginTop: 8 },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editorBtn: { flex: 1, backgroundColor: '#20343a', borderRadius: 10, padding: 10 },
  editorBtnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bfd2e6', borderRadius: 10, padding: 10 },
  cancelTxt: { color: '#456480', textAlign: 'center', fontWeight: '700' },
  vehicleDeleteBtn: { backgroundColor: '#fff1f1', borderRadius: 10, padding: 10, marginTop: 8 },
  vehicleDeleteTxt: { color: '#c53030', textAlign: 'center', fontWeight: '800' },
  tableTitle: { color: '#172b31', fontWeight: '800', marginTop: 12, marginBottom: 6 },
  tr: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5edf6' },
  thRow: { backgroundColor: '#eef4fb' },
  td: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, color: '#5a7087', fontSize: 12 },
  th: { color: '#172b31', fontWeight: '700' },
});
