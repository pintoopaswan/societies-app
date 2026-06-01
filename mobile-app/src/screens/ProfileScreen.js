import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { safeDateFromIso, toIsoDate } from '../lib/date';

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

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const navigation = useNavigation();
  const [showDate, setShowDate] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicles, setVehicles] = useState(parseVehicleList(user?.vehicle_list));
  const [flats, setFlats] = useState([]);
  const [photoUri, setPhotoUri] = useState(user?.photo_url || '');
  const [form, setForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    living_from: user?.living_from || toIsoDate(new Date()),
  });

  const vehicleListValue = useMemo(() => formatVehicles(vehicles), [vehicles]);
  const profileInitial = String(form.name || user?.name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const isOwner = String(user?.role || '').toUpperCase() === 'OWNER';

  const loadFlats = useCallback(async () => {
    if (!isOwner || !user?.mobile) return setFlats([]);
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
      setFlats(res.data || []);
    } catch {
      setFlats([]);
    }
  }, [isOwner, user?.mobile]);

  useFocusEffect(useCallback(() => { loadFlats(); }, [loadFlats]));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setPhotoUri(uri);
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
    Alert.alert('Delete vehicle', 'Remove this vehicle from your profile?', [
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

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    if (!form.mobile.trim()) return Alert.alert('Validation', 'Mobile is required.');
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) return Alert.alert('Validation', 'Mobile must be 10 digits.');
    if (!form.email.trim()) return Alert.alert('Validation', 'Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return Alert.alert('Validation', 'Email is invalid.');
    if (!form.living_from) return Alert.alert('Validation', 'Living From date is required.');
    try {
      await updateProfile({
        ...form,
        vehicle_list: vehicleListValue,
        photo_url: photoUri,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Unable to save', e.message || 'Try again.');
    }
  };

  return (
    <Page>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.meta}>Role: {user?.role || '-'}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={pickImage}>
          <Text style={styles.avatarText}>{profileInitial}</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
      <TextInput
        style={styles.input}
        placeholder="Mobile"
        value={form.mobile}
        onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^0-9]/g, '') }))}
        keyboardType="number-pad"
        inputMode="numeric"
        showSoftInputOnFocus
      />
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} autoCapitalize="none" />

      {isOwner ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flats</Text>
          </View>
          {flats.length === 0 ? <Text style={styles.emptyText}>No flats assigned.</Text> : null}
          <View style={styles.vehicleList}>
            {flats.map((flat) => (
              <TouchableOpacity
                key={String(flat.property_id)}
                style={styles.vehicleCard}
                onPress={() => navigation.navigate('TenantDetails', {
                  propertyId: flat.property_id,
                  readOnly: true,
                  snapshot: flat,
                })}
              >
                <View>
                  <Text style={styles.vehicleTitle}>{flat.block} | {flat.flat}</Text>
                  <Text style={styles.vehicleMeta}>Tenant: {flat.tenant_name || 'Not Available'}</Text>
                  <Text style={styles.vehicleMeta}>Occupied by: {String(flat.occupied_by || 'OWNER').toUpperCase() === 'TENANT' ? 'Tenant' : flat.is_occupied ? 'Owner' : 'Unoccupied'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

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

      <Text style={styles.label}>Living From</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.living_from}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.living_from)} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) setForm((p) => ({ ...p, living_from: toIsoDate(d) })); setShowDate(false); }} />}

      <TouchableOpacity style={styles.button} onPress={save}><Text style={styles.buttonText}>Save Profile</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#172b31', marginBottom: 4 },
  meta: { color: '#60788f', marginBottom: 4 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#20343a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginTop: 8 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginTop: 4 },
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
  button: { backgroundColor: '#20343a', padding: 12, borderRadius: 10, marginTop: 12 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
