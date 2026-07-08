import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
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
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);
const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const formatVehicles = (vehicles) => vehicles.map((v) => `${v.type}: ${v.reg}`).join(', ');

export default function AddTenantScreen() {
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const [showDate, setShowDate] = useState(false);
  const [block, setBlock] = useState(route.params?.block || BLOCKS[0]);
  const [flat, setFlat] = useState(route.params?.flat || '101');
  const [ownerName, setOwnerName] = useState(route.params?.owner_name || '');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenant_name: '',
    tenant_contact: '',
    tenant_photo_url: '',
    tenant_living_from: toIsoDate(new Date())
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const lookupOwner = async (b, f) => {
    try {
      const res = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(b)}&flat=${encodeURIComponent(f)}`);
      setOwnerName(res.data?.owner_name || '');
    } catch {
      setOwnerName('');
    }
  };

  useEffect(() => { lookupOwner(block, flat); }, []);

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) set('tenant_photo_url', r.assets[0].uri);
  };

  const addVehicle = () => {
    if (!vehicleNumber.trim()) return;
    setVehicles(p => [...p, { type: vehicleType, reg: vehicleNumber.trim().toUpperCase() }]);
    setVehicleNumber('');
    setShowVehicleForm(false);
  };

  const submit = async () => {
    if (!form.tenant_name.trim() || !form.tenant_contact.trim()) {
      return Alert.alert('Validation', 'Name and contact are required.');
    }
    setLoading(true);
    try {
      const res = await apiRequest('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({ block, flat, ...form, tenant_vehicle_list: formatVehicles(vehicles) }),
      }, token);
      Alert.alert('Saved', 'Tenant record created.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Administration</Text>
          <Text style={[styles.title, { color: colors.text }]}>Add Tenant</Text>
        </View>
        <Pressable onPress={pickPhoto} style={[styles.avatar, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          {form.tenant_photo_url ? (
            <Image source={{ uri: form.tenant_photo_url }} style={styles.avatarImg} />
          ) : (
            <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.primaryBlue} />
          )}
        </Pressable>
      </View>

      <Surface style={styles.card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Unit Assignment</Text>
        <View style={styles.row}>
          <FormField label="Block" style={{ flex: 1 }}>
            <FormPicker value={block} onValueChange={(v) => { setBlock(v); lookupOwner(v, flat); }} items={BLOCKS.map(b => ({ label: b, value: b }))} />
          </FormField>
          <View style={{ width: 10 }} />
          <FormField label="Flat" style={{ flex: 1 }}>
            <FormPicker value={flat} onValueChange={(v) => { setFlat(v); lookupOwner(block, v); }} items={FLATS.map(f => ({ label: f, value: f }))} />
          </FormField>
        </View>
        <FormField label="Owner Reference" isLast>
          <Surface tone="soft" style={styles.readOnly}>
            <Text style={[styles.readOnlyText, { color: colors.muted }]}>{ownerName || 'No owner linked'}</Text>
          </Surface>
        </FormField>
      </Surface>

      <Surface style={[styles.card, { marginTop: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Tenant Details</Text>
        <FormField label="Full Name*">
          <FormInput value={form.tenant_name} onChangeText={(v) => set('tenant_name', v)} placeholder="Full name" />
        </FormField>
        <FormField label="Contact Number*">
          <FormInput value={form.tenant_contact} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} placeholder="10-digit mobile" keyboardType="number-pad" />
        </FormField>
        <FormField label="Living From" isLast>
          <FormButton title={form.tenant_living_from} tone="secondary" onPress={() => setShowDate(true)} icon="calendar-outline" />
          {showDate && (
            <DateTimePicker
              value={safeDateFromIso(form.tenant_living_from)}
              mode="date"
              onChange={(e, d) => { setShowDate(false); if (d) set('tenant_living_from', toIsoDate(d)); }}
            />
          )}
        </FormField>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Vehicles" actionLabel="Add" onAction={() => setShowVehicleForm(true)} />
        {vehicles.length === 0 ? (
          <EmptyState icon="car-outline" title="No vehicles" subtitle="Registered vehicles will appear here." />
        ) : (
          <Surface style={{ padding: 0 }}>
            {vehicles.map((v, idx) => (
              <ActivityRow
                key={idx}
                title={v.reg}
                subtitle={v.type}
                icon={v.type === 'Car' ? 'car-outline' : 'motorbike'}
                isLast={idx === vehicles.length - 1}
                onPress={() => setVehicles(p => p.filter((_, i) => i !== idx))}
              />
            ))}
          </Surface>
        )}
      </View>

      {showVehicleForm && (
        <Surface style={styles.editor}>
          <Text style={[styles.editorTitle, { color: colors.text }]}>Add Vehicle</Text>
          <FormField label="Type">
            <FormPicker value={vehicleType} onValueChange={setVehicleType} items={VEHICLE_TYPES.map(t => ({ label: t, value: t }))} />
          </FormField>
          <FormField label="Registration Number">
            <FormInput value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" autoCapitalize="characters" />
          </FormField>
          <View style={styles.editorActions}>
            <FormButton title="Add" onPress={addVehicle} />
            <FormButton title="Cancel" onPress={() => setShowVehicleForm(false)} tone="secondary" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Tenant Record" onPress={submit} loading={loading} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  avatar: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 56, height: 56 },
  card: { padding: 20 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 16, letterSpacing: -0.2 },
  row: { flexDirection: 'row' },
  readOnly: { padding: 12, borderRadius: 10 },
  readOnlyText: { fontWeight: '600' },
  section: { marginTop: 24 },
  editor: { padding: 20, marginTop: 12 },
  editorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  editorActions: { gap: 10, marginTop: 10 },
  actions: { marginTop: 32, paddingBottom: 40 },
});
