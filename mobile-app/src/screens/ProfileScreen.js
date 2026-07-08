import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import { safeDateFromIso, toIsoDate } from '../lib/date';
import {
  SectionHeader,
  Surface,
  Badge,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
  SettingsRow,
} from '../components/DesignSystem';

const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const parseVehicleList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [type, ...rest] = item.split(':').map((p) => p.trim());
      const reg = rest.join(':').trim();
      return VEHICLE_TYPES.includes(type) ? { type, reg } : { type: 'Car', reg: item };
    });

const formatVehicles = (vehicles) =>
  vehicles.map((v) => `${v.type}: ${v.reg}`).join(', ');

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const navigation = useNavigation();
  const { colors, radius } = useAppTheme();

  const [showDate, setShowDate] = useState(false);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicles, setVehicles] = useState(parseVehicleList(user?.vehicle_list));
  const [flats, setFlats] = useState([]);
  const [photoUri, setPhotoUri] = useState(user?.photo_url || '');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:        user?.name        || '',
    mobile:      user?.mobile      || '',
    email:       user?.email       || '',
    living_from: user?.living_from || toIsoDate(new Date()),
  });

  const isOwner = String(user?.role || '').toUpperCase() === 'OWNER';
  const initial = String(form.name || user?.name || 'U').charAt(0).toUpperCase();

  const loadFlats = useCallback(async () => {
    if (!isOwner || !user?.mobile) return;
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
      setFlats(res.data || []);
    } catch {}
  }, [isOwner, user?.mobile]);

  useFocusEffect(useCallback(() => { loadFlats(); }, [loadFlats]));

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) setPhotoUri(r.assets[0].uri);
  };

  const addVehicle = () => {
    if (!vehicleNumber.trim()) return;
    setVehicles(p => [...p, { type: vehicleType, reg: vehicleNumber.trim().toUpperCase() }]);
    setVehicleNumber('');
    setShowVehicleForm(false);
  };

  const save = async () => {
    if (!form.name.trim() || !form.mobile.trim() || !form.email.trim()) {
      return Alert.alert('Validation', 'Required fields missing.');
    }
    setLoading(true);
    try {
      await updateProfile({ ...form, vehicle_list: formatVehicles(vehicles), photo_url: photoUri });
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Surface style={styles.headerCard}>
        <View style={styles.headerMain}>
          <Pressable onPress={pickImage} style={[styles.avatar, { backgroundColor: colors.surfaceSoft }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
            )}
            <View style={[styles.avatarEdit, { backgroundColor: colors.primaryBlue }]}>
              <MaterialCommunityIcons name="camera-outline" size={10} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>{form.name || 'Resident'}</Text>
            <View style={styles.headerBadgeRow}>
              <Badge label={String(user?.role || 'Resident').toUpperCase()} tone="info" />
              {user?.block && <Badge label={`${user.block} · ${user.flat}`} tone="neutral" />}
            </View>
          </View>
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Account Details" />
        <Surface style={styles.card}>
          <FormField label="Full Name">
            <FormInput value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
          </FormField>
          <FormField label="Mobile Number">
            <FormInput value={form.mobile} onChangeText={(v) => setForm(p => ({ ...p, mobile: v.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
          </FormField>
          <FormField label="Email Address" isLast>
            <FormInput value={form.email} onChangeText={(v) => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" />
          </FormField>
        </Surface>
      </View>

      {isOwner && (
        <View style={styles.section}>
          <SectionHeader title="Linked Flats" />
          <Surface style={{ padding: 0 }}>
            {flats.map((flat, idx) => (
              <SettingsRow
                key={flat.property_id}
                icon="home-city-outline"
                label={`${flat.block} · ${flat.flat}`}
                value={flat.tenant_name ? `Tenant: ${flat.tenant_name}` : 'Self-occupied'}
                isLast={idx === flats.length - 1}
                onPress={() => navigation.navigate('TenantDetails', { propertyId: flat.property_id, readOnly: true, snapshot: flat })}
              />
            ))}
            {flats.length === 0 && <View style={{ padding: 20 }}><Text style={{ color: colors.muted }}>No flats linked to this account.</Text></View>}
          </Surface>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <Surface style={styles.card}>
          <FormField label="Living From">
            <FormButton title={form.living_from} tone="secondary" icon="calendar-outline" onPress={() => setShowDate(true)} />
            {showDate && (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(e, d) => { setShowDate(false); if (d) setForm(p => ({ ...p, living_from: toIsoDate(d) })); }}
              />
            )}
          </FormField>
          <FormField label="My Vehicles" isLast>
            {vehicles.map((v, idx) => (
              <View key={idx} style={styles.vehicleRow}>
                <MaterialCommunityIcons name={v.type === 'Car' ? 'car-outline' : 'motorbike'} size={18} color={colors.primaryBlue} />
                <Text style={[styles.vehicleText, { color: colors.text }]}>{v.type}: {v.reg}</Text>
                <TouchableOpacity onPress={() => setVehicles(p => p.filter((_, i) => i !== idx))}>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <FormButton title="Add Vehicle" tone="secondary" icon="plus" onPress={() => setShowVehicleForm(true)} />
          </FormField>
        </Surface>
      </View>

      {showVehicleForm && (
        <Surface style={styles.editor}>
          <Text style={[styles.editorTitle, { color: colors.text }]}>Add Vehicle</Text>
          <FormField label="Type">
            <FormPicker value={vehicleType} onValueChange={setVehicleType} items={VEHICLE_TYPES.map(t => ({ label: t, value: t }))} />
          </FormField>
          <FormField label="Registration">
            <FormInput value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="KA01AB1234" autoCapitalize="characters" />
          </FormField>
          <View style={styles.editorActions}>
            <FormButton title="Add" onPress={addVehicle} />
            <FormButton title="Cancel" onPress={() => setShowVehicleForm(false)} tone="secondary" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Changes" onPress={save} loading={loading} />
        <FormButton title="Sign Out" onPress={() => setShowLogoutModal(true)} tone="secondary" />
      </View>

      <Modal visible={showLogoutModal} transparent animationType="fade">
        <Pressable style={[styles.modalBack, { backgroundColor: colors.overlay }]} onPress={() => setShowLogoutModal(false)}>
          <Surface style={styles.modal}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign out?</Text>
            <Text style={[styles.modalBody, { color: colors.muted }]}>Are you sure you want to log out of your account?</Text>
            <View style={styles.modalActions}>
              <FormButton title="Logout" onPress={logout} tone="danger" />
              <FormButton title="Cancel" onPress={() => setShowLogoutModal(false)} tone="secondary" />
            </View>
          </Surface>
        </Pressable>
      </Modal>

      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  headerCard: { padding: 0, overflow: 'hidden', marginBottom: 16 },
  headerMain: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 64, height: 64 },
  avatarText: { fontSize: 24, fontWeight: '900' },
  avatarEdit: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  headerBadgeRow: { flexDirection: 'row', gap: 6 },
  section: { marginTop: 8, marginBottom: 16 },
  card: { padding: 20 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginBottom: 4 },
  vehicleText: { flex: 1, fontWeight: '600' },
  editor: { padding: 20, marginTop: 8 },
  editorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  editorActions: { gap: 10, marginTop: 10 },
  actions: { gap: 12, marginTop: 8 },
  modalBack: { flex: 1, justifyContent: 'center', padding: 24 },
  modal: { padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalBody: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  modalActions: { gap: 10 },
});
