import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { safeDateFromIso, toIsoDate } from '../lib/date';

// ─── Design tokens (mirrors DashboardScreen) ─────────────────────────────────
const PALETTE = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  ink: '#0F0F10',
  inkSecondary: '#6B7280',
  inkTertiary: '#9CA3AF',
  blue: '#2563EB',
  blueSoft: '#EFF4FF',
  blueMid: '#DBEAFE',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
  rose: '#E11D48',
  roseSoft: '#FFF1F2',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
};

const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, xxl: 28, pill: 999 };

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
});

// ─── Data constants ───────────────────────────────────────────────────────────
const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);
const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const formatVehicles = (vehicles) => vehicles.map((v) => `${v.type}: ${v.reg}`).join(', ');

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function InputField({ value, onChangeText, placeholder, keyboardType, inputMode, secureTextEntry }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={PALETTE.inkTertiary}
      keyboardType={keyboardType}
      inputMode={inputMode}
      secureTextEntry={secureTextEntry}
    />
  );
}

function SectionHeader({ title, onAdd }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      >
        <MaterialCommunityIcons name="plus" size={18} color="#fff" />
        <Text style={styles.addBtnTxt}>Add</Text>
      </Pressable>
    </View>
  );
}

function VehicleTypePill({ type }) {
  const map = {
    Car:    { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
    Bike:   { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
    Scooty: { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
  };
  const c = map[type] || map.Car;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{type}</Text>
    </View>
  );
}

function VehicleCard({ vehicle, index, onEdit, onDelete }) {
  const iconMap = { Car: 'car-outline', Bike: 'motorbike', Scooty: 'scooter' };
  const icon = iconMap[vehicle.type] || 'car-outline';
  return (
    <Pressable
      onPress={() => onEdit(vehicle, index)}
      style={({ pressed }) => [styles.vehicleCard, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View style={styles.vehicleCardIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={PALETTE.blue} />
      </View>
      <View style={styles.vehicleCardContent}>
        <View style={styles.vehicleCardTop}>
          <VehicleTypePill type={vehicle.type} />
        </View>
        <Text style={styles.vehicleCardReg}>{vehicle.reg}</Text>
      </View>
      <Pressable
        onPress={() => onDelete(index)}
        style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? PALETTE.roseSoft : PALETTE.surfaceMuted }]}
        hitSlop={8}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={17} color={PALETTE.rose} />
      </Pressable>
    </Pressable>
  );
}

function EditorSheet({ title, children }) {
  return (
    <View style={styles.editorSheet}>
      <View style={styles.editorHandle} />
      <Text style={styles.editorTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

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

  const onChangeBlock = (v) => { setBlock(v); lookupOwner(v, flat); };
  const onChangeFlat = (v) => { setFlat(v); lookupOwner(block, v); };

  useEffect(() => { lookupOwner(block, flat); }, []);

  const updateTenantPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) set('tenant_photo_url', uri);
  };

  const openAddVehicle = () => { setVehicleType('Car'); setVehicleNumber(''); setEditingVehicleIndex(null); setShowVehicleForm(true); };
  const openEditVehicle = (vehicle, idx) => { setVehicleType(vehicle.type || 'Car'); setVehicleNumber(vehicle.reg || ''); setEditingVehicleIndex(idx); setShowVehicleForm(true); };

  const saveVehicle = () => {
    const reg = vehicleNumber.trim();
    if (!reg) return Alert.alert('Validation', 'Vehicle number is required.');
    setVehicles((prev) => {
      const next = [...prev];
      if (editingVehicleIndex === null) next.push({ type: vehicleType, reg });
      else next[editingVehicleIndex] = { type: vehicleType, reg };
      return next;
    });
    setVehicleNumber(''); setEditingVehicleIndex(null); setShowVehicleForm(false);
  };

  const removeVehicle = (idx) => {
    Alert.alert('Delete vehicle', 'Remove this vehicle from tenant details?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setVehicles((prev) => prev.filter((_, i) => i !== idx));
        if (editingVehicleIndex === idx) { setEditingVehicleIndex(null); setShowVehicleForm(false); setVehicleNumber(''); }
      }},
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
        body: JSON.stringify({ block, flat, ...form, tenant_vehicle_list: vehicleListValue }),
      }, token);
      navigation.navigate('TenantsList', { priorityPropertyId: res.property_id });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <Page style={{ backgroundColor: PALETTE.bg }}>
      {/* ── Page header with avatar ── */}
      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RESIDENTS</Text>
          <Text style={styles.title}>Add Tenant</Text>
        </View>
        <Pressable onPress={updateTenantPhoto} style={({ pressed }) => [styles.avatar, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <Text style={styles.avatarText}>{tenantInitial}</Text>
          <View style={styles.avatarEditBadge}>
            <MaterialCommunityIcons name="camera-outline" size={11} color="#fff" />
          </View>
        </Pressable>
      </View>

      {/* ── Unit assignment card ── */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Unit Assignment</Text>

        <FieldLabel>Block</FieldLabel>
        <View style={styles.pickWrap}>
          <Picker selectedValue={block} onValueChange={onChangeBlock}>
            {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
          </Picker>
        </View>

        <FieldLabel>Flat</FieldLabel>
        <View style={styles.pickWrap}>
          <Picker selectedValue={flat} onValueChange={onChangeFlat}>
            {FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}
          </Picker>
        </View>

        <FieldLabel>Owner Name</FieldLabel>
        <View style={styles.readOnlyBox}>
          <MaterialCommunityIcons name="home-account" size={16} color={PALETTE.emerald} style={{ marginRight: 8 }} />
          <Text style={styles.readOnlyText}>{ownerName || 'No owner found'}</Text>
        </View>
      </View>

      {/* ── Tenant details card ── */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Tenant Details</Text>

        <FieldLabel>Full Name</FieldLabel>
        <InputField value={form.tenant_name} onChangeText={(v) => set('tenant_name', v)} placeholder="Enter tenant name" />

        <FieldLabel>Contact Number</FieldLabel>
        <InputField
          value={form.tenant_contact}
          onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))}
          placeholder="10-digit mobile number"
          keyboardType="number-pad"
          inputMode="numeric"
        />

        <FieldLabel>Living From</FieldLabel>
        <Pressable onPress={() => setShowDate(true)} style={({ pressed }) => [styles.dateBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <MaterialCommunityIcons name="calendar-outline" size={17} color={PALETTE.blue} />
          <Text style={styles.dateBtnText}>{form.tenant_living_from || 'Select date'}</Text>
        </Pressable>
        {showDate && (
          <DateTimePicker
            value={safeDateFromIso(form.tenant_living_from)}
            mode="date"
            onChange={(event, d) => {
              if (event.type === 'dismissed') { setShowDate(false); return; }
              if (d) set('tenant_living_from', toIsoDate(d));
              setShowDate(false);
            }}
          />
        )}
      </View>

      {/* ── Vehicles section ── */}
      <SectionHeader title="Vehicles" onAdd={openAddVehicle} />

      {vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.amberSoft }]}>
            <MaterialCommunityIcons name="car-outline" size={26} color={PALETTE.amber} />
          </View>
          <Text style={styles.emptyTitle}>No vehicles added</Text>
          <Text style={styles.emptyBody}>Tap "Add" to register a vehicle for this tenant.</Text>
        </View>
      ) : (
        <View style={styles.vehicleList}>
          {vehicles.map((vehicle, idx) => (
            <VehicleCard key={`${vehicle.type}-${vehicle.reg}-${idx}`} vehicle={vehicle} index={idx} onEdit={openEditVehicle} onDelete={removeVehicle} />
          ))}
        </View>
      )}

      {/* ── Vehicle editor ── */}
      {showVehicleForm ? (
        <EditorSheet title={editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'}>
          <FieldLabel>Vehicle Type</FieldLabel>
          <View style={styles.pickWrap}>
            <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
              {VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
            </Picker>
          </View>
          <FieldLabel>Registration Number</FieldLabel>
          <InputField value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" />
          <View style={styles.editorActions}>
            <Pressable
              onPress={saveVehicle}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
              <Text style={styles.primaryBtnTxt}>Save Vehicle</Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowVehicleForm(false); setEditingVehicleIndex(null); setVehicleNumber(''); }}
              style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.ghostBtnTxt}>Cancel</Text>
            </Pressable>
          </View>
          {editingVehicleIndex !== null ? (
            <Pressable
              onPress={() => removeVehicle(editingVehicleIndex)}
              style={({ pressed }) => [styles.destructiveBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={PALETTE.rose} />
              <Text style={styles.destructiveBtnTxt}>Delete Vehicle</Text>
            </Pressable>
          ) : null}
        </EditorSheet>
      ) : null}

      {/* ── Save button ── */}
      <Pressable
        onPress={submit}
        style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <MaterialCommunityIcons name="content-save-outline" size={19} color="#fff" />
        <Text style={styles.saveBtnTxt}>Save Tenant</Text>
      </Pressable>
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: PALETTE.inkTertiary, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.6, marginTop: 2 },

  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: PALETTE.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  avatarEditBadge: { position: 'absolute', bottom: 1, right: 1, width: 18, height: 18, borderRadius: 9, backgroundColor: PALETTE.blue, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: PALETTE.bg },

  card: { backgroundColor: PALETTE.surface, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: PALETTE.border, padding: 18, marginBottom: 18, ...CARD_SHADOW },
  cardHeading: { fontSize: 15, fontWeight: '800', color: PALETTE.ink, letterSpacing: -0.2, marginBottom: 12 },

  label: { fontSize: 11, fontWeight: '800', color: PALETTE.inkSecondary, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: PALETTE.surfaceMuted, borderWidth: 1.5, borderColor: PALETTE.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: PALETTE.ink, marginBottom: 10 },
  pickWrap: { backgroundColor: PALETTE.surfaceMuted, borderWidth: 1.5, borderColor: PALETTE.border, borderRadius: RADIUS.md, marginBottom: 10, overflow: 'hidden' },
  readOnlyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.emeraldSoft, borderWidth: 1.5, borderColor: '#A7F3D0', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  readOnlyText: { fontSize: 15, fontWeight: '700', color: PALETTE.emerald },

  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: PALETTE.surfaceMuted, borderWidth: 1.5, borderColor: PALETTE.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
  dateBtnText: { fontSize: 15, fontWeight: '600', color: PALETTE.ink },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PALETTE.ink, borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 14 },
  addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  vehicleList: { gap: 10, marginBottom: 4 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: PALETTE.border, padding: 14, gap: 12, ...CARD_SHADOW },
  vehicleCardIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: PALETTE.blueSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vehicleCardContent: { flex: 1, minWidth: 0 },
  vehicleCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vehicleCardReg: { fontSize: 15, fontWeight: '800', color: PALETTE.ink, letterSpacing: -0.1 },
  iconBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },

  pill: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  emptyIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink },
  emptyBody: { fontSize: 13, lineHeight: 19, fontWeight: '500', color: PALETTE.inkSecondary, textAlign: 'center' },

  editorSheet: { backgroundColor: PALETTE.surface, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: PALETTE.border, padding: 18, marginTop: 8, marginBottom: 8, ...CARD_SHADOW },
  editorHandle: { width: 36, height: 4, borderRadius: RADIUS.pill, backgroundColor: PALETTE.border, alignSelf: 'center', marginBottom: 14 },
  editorTitle: { fontSize: 17, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.3, marginBottom: 12 },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 6 },

  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PALETTE.blue, borderRadius: RADIUS.md, paddingVertical: 13 },
  primaryBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ghostBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.border, paddingVertical: 13 },
  ghostBtnTxt: { color: PALETTE.inkSecondary, fontSize: 14, fontWeight: '800' },
  destructiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: PALETTE.roseSoft, borderRadius: RADIUS.md, paddingVertical: 12, marginTop: 4 },
  destructiveBtnTxt: { color: PALETTE.rose, fontSize: 13, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PALETTE.ink, borderRadius: RADIUS.xl, paddingVertical: 16, marginTop: 10 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
});