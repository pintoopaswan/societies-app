import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
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
import { useAppTheme, typography } from '../lib/theme';
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
      <Surface level={2} style={styles.headerCard}>
        <View style={styles.headerMain}>
          <Pressable onPress={pickImage} style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>{initial}</Text>
            )}
            <View style={[styles.avatarEdit, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="camera" size={12} color={colors.onPrimary} />
            </View>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.onSurface }]} numberOfLines={1}>{form.name || 'Resident'}</Text>
            <View style={styles.headerBadgeRow}>
              <Badge label={String(user?.role || 'Resident').toUpperCase()} tone="info" />
              {user?.block && <Badge label={`${user.block} · ${user.flat}`} tone="neutral" />}
            </View>
          </View>
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Account Details" />
        <Surface level={1} style={styles.card}>
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

      {isOwner && flats.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="My Properties" />
          <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
            {flats.map((flat, idx) => (
              <SettingsRow
                key={flat.property_id}
                icon="home-city"
                label={`${flat.block} · ${flat.flat}`}
                value={flat.tenant_name ? `Resident: ${flat.tenant_name}` : 'Self-occupied'}
                isLast={idx === flats.length - 1}
                onPress={() => navigation.navigate('TenantDetails', { propertyId: flat.property_id, readOnly: true, snapshot: flat })}
              />
            ))}
          </Surface>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <Surface level={1} style={styles.card}>
          <FormField label="Living From">
            <FormButton title={form.living_from} tone="secondary" icon="calendar" onPress={() => setShowDate(true)} />
            {showDate && (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(e, d) => { setShowDate(false); if (d) setForm(p => ({ ...p, living_from: toIsoDate(d) })); }}
              />
            )}
          </FormField>
          <FormField label="Registered Vehicles" isLast>
            <View style={styles.vehicleList}>
              {vehicles.map((v, idx) => (
                <Surface key={idx} level={2} style={styles.vehicleRow}>
                  <MaterialCommunityIcons name={v.type === 'Car' ? 'car' : 'motorbike'} size={20} color={colors.primary} />
                  <Text style={[styles.vehicleText, { color: colors.onSurface }]}>{v.reg}</Text>
                  <Pressable onPress={() => setVehicles(p => p.filter((_, i) => i !== idx))}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.error} />
                  </Pressable>
                </Surface>
              ))}
            </View>
            <FormButton title="Add Vehicle" tone="outlined" icon="plus" onPress={() => setShowVehicleForm(true)} />
          </FormField>
        </Surface>
      </View>

      {showVehicleForm && (
        <Surface level={2} style={styles.editor}>
          <Text style={[styles.editorTitle, { color: colors.onSurface }]}>Add Vehicle</Text>
          <FormField label="Type">
            <FormPicker value={vehicleType} onValueChange={setVehicleType} items={VEHICLE_TYPES.map(t => ({ label: t, value: t }))} />
          </FormField>
          <FormField label="Registration Number">
            <FormInput value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" autoCapitalize="characters" />
          </FormField>
          <View style={styles.editorActions}>
            <FormButton title="Add Vehicle" onPress={addVehicle} />
            <FormButton title="Cancel" onPress={() => setShowVehicleForm(false)} tone="outlined" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Changes" onPress={save} loading={loading} />
        <FormButton title="Sign Out" onPress={() => setShowLogoutModal(true)} tone="secondary" />
      </View>

      <Modal visible={showLogoutModal} transparent animationType="fade">
        <Pressable style={[styles.modalBack, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setShowLogoutModal(false)}>
          <Surface level={2} style={styles.modal}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Sign out?</Text>
            <Text style={[styles.modalBody, { color: colors.onSurfaceVariant }]}>Are you sure you want to log out of your account?</Text>
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
  headerCard: { padding: 0, overflow: 'hidden', marginBottom: 16, borderRadius: radius.xxl },
  headerMain: { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 20 },
  avatar: { width: 80, height: 80, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 80, height: 80 },
  avatarText: { ...typography.headlineMedium, fontWeight: '700' },
  avatarEdit: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  headerInfo: { flex: 1 },
  headerName: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  headerBadgeRow: { flexDirection: 'row', gap: 8 },
  section: { marginTop: 12, marginBottom: 24 },
  card: { padding: 20, borderRadius: radius.xl },
  vehicleList: { marginBottom: 12, gap: 8 },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.lg },
  vehicleText: { flex: 1, ...typography.titleMedium, fontWeight: '700' },
  editor: { padding: 24, marginTop: 8, borderRadius: radius.xxl },
  editorTitle: { ...typography.titleLarge, fontWeight: '700', marginBottom: 20 },
  editorActions: { gap: 12, marginTop: 12 },
  actions: { gap: 16, marginTop: 12 },
  modalBack: { flex: 1, justifyContent: 'center', padding: 24 },
  modal: { padding: 32, gap: 16, borderRadius: radius.xxl },
  modalTitle: { ...typography.headlineSmall, fontWeight: '700', textAlign: 'center' },
  modalBody: { ...typography.bodyLarge, textAlign: 'center', marginBottom: 12 },
  modalActions: { gap: 12 },
});
