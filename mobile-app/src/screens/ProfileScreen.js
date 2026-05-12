import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../lib/auth';
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

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [showDate, setShowDate] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicles, setVehicles] = useState(parseVehicleList(user?.vehicle_list));
  const [photoUri, setPhotoUri] = useState(user?.photo_url || '');
  const [form, setForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    living_from: user?.living_from || toIsoDate(new Date()),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setPhotoUri(uri);
    }
  };

  const addVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return;
    setVehicles((prev) => [...prev, { type: vehicleType, reg }]);
    setVehicleNumber('');
  };

  const removeVehicle = (idx) => setVehicles((prev) => prev.filter((_, i) => i !== idx));

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
        vehicle_list: vehicles.map((v) => `${v.type}: ${v.reg}`).join(', '),
        photo_url: photoUri,
      });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Unable to save', e.message || 'Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.meta}>Role: {user?.role || '-'}</Text>
          <Text style={styles.meta}>Flat: {user?.block || '-'} | {user?.flat || '-'}</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
          <Text style={styles.photoBtnText}>Update Photo</Text>
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
      <View style={styles.chipWrap}>
        {vehicles.map((v, i) => (
          <TouchableOpacity key={`${v.type}-${v.reg}-${i}`} style={styles.chip} onPress={() => removeVehicle(i)}>
            <Text style={styles.chipTxt}>{v.type}: {v.reg} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!photoUri && <Image source={{ uri: photoUri }} style={styles.photo} />}
      <TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{form.living_from}</Text></TouchableOpacity>
      {showDate && <DateTimePicker value={safeDateFromIso(form.living_from)} mode="date" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) setForm((p) => ({ ...p, living_from: toIsoDate(d) })); setShowDate(false); }} />}
      <TouchableOpacity style={styles.button} onPress={save}><Text style={styles.buttonText}>Save Profile</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f7fb' },
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 4 },
  meta: { color: '#60788f', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  photoBtn: { backgroundColor: '#1f6fb2', padding: 10, borderRadius: 10 },
  photoBtnText: { color: '#fff', fontWeight: '700' },
  photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: '#e7edf6', marginTop: 8 },
  vehicleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  addBtn: { backgroundColor: '#1f6fb2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  addTxt: { color: '#fff', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { backgroundColor: '#e8f1ff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  chipTxt: { color: '#1f6fb2', fontWeight: '700' },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
