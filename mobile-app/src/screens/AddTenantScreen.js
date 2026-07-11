import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
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
      await apiRequest('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({ block, flat, ...form, tenant_vehicle_list: formatVehicles(vehicles) }),
      }, token);
      Alert.alert('Saved', 'Resident record created.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <SectionHeader title="Resident Registration" subtitle="Assign a new resident to a property." />

      <Surface level={2} style={styles.heroCard}>
        <Pressable onPress={pickPhoto} style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          {form.tenant_photo_url ? (
            <Image source={{ uri: form.tenant_photo_url }} style={styles.avatarImg} />
          ) : (
            <MaterialCommunityIcons name="camera-plus" size={32} color={colors.onPrimaryContainer} />
          )}
        </Pressable>
        <View style={styles.heroText}>
          <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Resident Identity</Text>
          <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>Tap the icon to upload a photo.</Text>
        </View>
      </Surface>

      <Surface level={1} style={styles.card}>
        <SectionHeader title="Property Details" />
        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <FormField label="Block">
              <FormPicker value={block} onValueChange={(v) => { setBlock(v); lookupOwner(v, flat); }} items={BLOCKS.map(b => ({ label: b, value: b }))} />
            </FormField>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FormField label="Flat">
              <FormPicker value={flat} onValueChange={(v) => { setFlat(v); lookupOwner(block, v); }} items={FLATS.map(f => ({ label: f, value: f }))} />
            </FormField>
          </View>
        </View>
        <FormField label="Linked Owner" isLast>
          <Surface level={2} style={styles.readOnly}>
            <Badge label={ownerName || 'No owner linked'} tone={ownerName ? "info" : "warning"} />
          </Surface>
        </FormField>
      </Surface>

      <Surface level={1} style={[styles.card, { marginTop: 24 }]}>
        <SectionHeader title="Personal Details" />
        <FormField label="Full Name">
          <FormInput value={form.tenant_name} onChangeText={(v) => set('tenant_name', v)} placeholder="e.g. John Doe" />
        </FormField>
        <FormField label="Contact Number">
          <FormInput value={form.tenant_contact} onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))} placeholder="10-digit mobile" keyboardType="number-pad" />
        </FormField>
        <FormField label="Move-in Date" isLast>
          <FormButton title={form.tenant_living_from} tone="secondary" onPress={() => setShowDate(true)} icon="calendar" />
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
        <SectionHeader title="Vehicles" actionLabel="Add Vehicle" onAction={() => setShowVehicleForm(true)} icon="plus" />
        {vehicles.length === 0 ? (
          <EmptyState icon="car" title="No vehicles" subtitle="Register resident vehicles for gate security." />
        ) : (
          <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
            {vehicles.map((v, idx) => (
              <ActivityRow
                key={idx}
                title={v.reg}
                subtitle={v.type}
                icon={v.type === 'Car' ? 'car' : 'motorbike'}
                isLast={idx === vehicles.length - 1}
                onPress={() => setVehicles(p => p.filter((_, i) => i !== idx))}
              />
            ))}
          </Surface>
        )}
      </View>

      {showVehicleForm && (
        <Surface level={2} style={styles.editor}>
          <SectionHeader title="New Vehicle" />
          <FormField label="Type">
            <FormPicker value={vehicleType} onValueChange={setVehicleType} items={VEHICLE_TYPES.map(t => ({ label: t, value: t }))} />
          </FormField>
          <FormField label="Registration Number">
            <FormInput value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="KA01AB1234" autoCapitalize="characters" />
          </FormField>
          <View style={styles.editorActions}>
            <FormButton title="Add" onPress={addVehicle} />
            <FormButton title="Cancel" onPress={() => setShowVehicleForm(false)} tone="outlined" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Register Resident" onPress={submit} loading={loading} />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: radius.xxl, gap: 20, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 72, height: 72 },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { ...typography.titleLarge, fontWeight: '700' },
  heroSubtitle: { ...typography.bodySmall },
  card: { padding: 24, borderRadius: radius.xl },
  formRow: { flexDirection: 'row' },
  readOnly: { padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  section: { marginTop: 32 },
  editor: { padding: 24, marginTop: 16, borderRadius: radius.xxl },
  editorActions: { gap: 12, marginTop: 16 },
  actions: { marginTop: 40 },
});
