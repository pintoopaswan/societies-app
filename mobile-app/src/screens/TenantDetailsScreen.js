import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

const VEHICLE_ICONS = {
  Scooty: 'scooter',
  Bike:   'motorbike',
  Car:    'car-outline',
};

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

// ─── Design tokens (aligned with DashboardScreen) ────────────────────────────

const P = {
  // Backgrounds
  bg:            '#F6F7F9',
  surface:       '#FFFFFF',
  surfaceMuted:  '#F2F4F7',

  // Pastel tints — used for header & accents
  lavender:      '#EEF0FD',   // indigo-tinted pastel
  lavenderMid:   '#DFE2FB',
  lavenderDeep:  '#4F46E5',   // indigo for header accent

  sage:          '#EAFAF4',   // green pastel
  sageMid:       '#C6F0DF',
  sageDeep:      '#059669',

  sky:           '#EBF2FF',   // blue pastel
  skyMid:        '#D4E5FD',
  skyDeep:       '#1D6AF0',

  peach:         '#FFF4EE',   // warm pastel for warnings / delete
  peachDeep:     '#E05A2B',

  rose:          '#FFF0F3',
  roseDeep:      '#DC2C55',

  // Text
  ink:           '#0D0F12',
  inkSecondary:  '#5C6470',
  inkTertiary:   '#9EA5B0',

  // Border
  border:        '#E8EAED',
  borderFaint:   '#F2F4F6',
};

const R = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  26,
  pill: 999,
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0D0F12',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

// ─── Reusable primitives ─────────────────────────────────────────────────────

/** Labelled field wrapper */
function Field({ label, children }) {
  return (
    <View style={f.field}>
      <Text style={f.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Section card container */
function SectionCard({ children, style }) {
  return <View style={[f.sectionCard, style]}>{children}</View>;
}

/** Section heading row inside a card */
function SectionHeading({ icon, label, iconBg, iconColor, action }) {
  return (
    <View style={f.sectionHeadingRow}>
      <View style={[f.sectionHeadingIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={f.sectionHeadingLabel}>{label}</Text>
      {action || null}
    </View>
  );
}

/** Read-only info row */
function InfoRow({ icon, label, value, iconColor = P.lavenderDeep, iconBg = P.lavender, onPress }) {
  const Inner = (
    <View style={f.infoRow}>
      <View style={[f.infoIconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <View style={f.infoTextGroup}>
        <Text style={f.infoLabel}>{label}</Text>
        <Text style={f.infoValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={17} color={P.inkTertiary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {Inner}
      </TouchableOpacity>
    );
  }
  return Inner;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TenantDetailsScreen() {
  const { token }    = useAuth();
  const navigation   = useNavigation();
  const route        = useRoute();

  const propertyId   = route.params?.propertyId;
  const readOnly     = !!route.params?.readOnly;
  const snapshot     = route.params?.snapshot || null;

  const [showDate,             setShowDate]             = useState(false);
  const [vehicleType,          setVehicleType]          = useState('Car');
  const [vehicleNumber,        setVehicleNumber]        = useState('');
  const [editingVehicleIndex,  setEditingVehicleIndex]  = useState(null);
  const [showVehicleForm,      setShowVehicleForm]      = useState(false);
  const [form,                 setForm]                 = useState(null);

  const vehicles       = useMemo(() => parseVehicleList(form?.tenant_vehicle_list || ''), [form?.tenant_vehicle_list]);
  const tenantInitial  = String(form?.tenant_name || 'T').trim().charAt(0).toUpperCase() || 'T';
  const set            = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // ─── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (snapshot) {
      let paymentHistory = snapshot.payment_history || [];
      if (propertyId) {
        try {
          const tenantRes = await apiRequest(`/api/tenants/${propertyId}`);
          paymentHistory = tenantRes.data?.payment_history || paymentHistory;
        } catch { /* keep snapshot data */ }
      }
      setForm({
        property_id:                   propertyId,
        block:                         snapshot.block || '',
        flat:                          snapshot.flat || '',
        owner_name:                    snapshot.owner_name || '',
        owner_contact:                 snapshot.owner_contact || '',
        tenant_name:                   snapshot.tenant_name || '',
        tenant_contact:                snapshot.tenant_contact || '',
        tenant_vehicle_list:           snapshot.tenant_vehicle_list || '',
        tenant_photo_url:              snapshot.tenant_photo_url || '',
        tenant_living_from:            snapshot.tenant_living_from || '',
        tenant_guard_payment_details:  snapshot.tenant_guard_payment_details || '',
        payment_history:               paymentHistory,
      });
      return;
    }
    const res = await apiRequest(`/api/tenants/${propertyId}`);
    setForm(res.data);
  }, [propertyId, snapshot]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ─── Vehicle helpers ────────────────────────────────────────────────────────

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
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          updateVehicleList(vehicles.filter((_, i) => i !== idx));
          if (editingVehicleIndex === idx) {
            setEditingVehicleIndex(null);
            setShowVehicleForm(false);
            setVehicleNumber('');
          }
        },
      },
    ]);
  };

  // ─── Photo ──────────────────────────────────────────────────────────────────

  const updateTenantPhoto = async () => {
    if (readOnly) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) set('tenant_photo_url', uri);
  };

  // ─── Save / Delete ──────────────────────────────────────────────────────────

  const save = async () => {
    if (!form.tenant_name?.trim())    return Alert.alert('Validation', 'Tenant Name is required.');
    if (!form.tenant_contact?.trim()) return Alert.alert('Validation', 'Tenant Contact is required.');
    if (!/^[0-9]{10}$/.test(String(form.tenant_contact).trim()))
      return Alert.alert('Validation', 'Tenant Contact must be 10 digits.');
    if (!form.tenant_living_from)     return Alert.alert('Validation', 'Living From date is required.');
    try {
      await apiRequest(
        `/api/tenants/${propertyId}`,
        { method: 'PUT', body: JSON.stringify({ ...form, tenant_vehicle_list: formatVehicles(vehicles) }) },
        token,
      );
      Alert.alert('Saved', 'Tenant details updated');
      navigation.navigate('TenantsList', { priorityPropertyId: propertyId });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const del = async () => {
    Alert.alert('Delete tenant info', 'This will permanently remove the tenant record.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await apiRequest(`/api/tenants/${propertyId}`, { method: 'DELETE' }, token);
          navigation.goBack();
        },
      },
    ]);
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (!form) {
    return (
      <Page style={{ backgroundColor: P.bg }}>
        <View style={f.loadingWrap}>
          <MaterialCommunityIcons name="account-clock-outline" size={36} color={P.lavenderDeep} />
          <Text style={f.loadingText}>Loading tenant details…</Text>
        </View>
      </Page>
    );
  }

  const paymentHistory = form.payment_history || [];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page style={{ backgroundColor: P.bg }}>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <View style={f.heroCard}>
        {/* Soft pastel gradient blobs for depth */}
        <View style={f.heroBlob1} />
        <View style={f.heroBlob2} />

        <View style={f.heroInner}>
          {/* Avatar */}
          <TouchableOpacity
            style={f.avatarWrap}
            onPress={updateTenantPhoto}
            disabled={readOnly}
            activeOpacity={0.8}
          >
            <View style={f.avatar}>
              <Text style={f.avatarInitial}>{tenantInitial}</Text>
            </View>
            {!readOnly && (
              <View style={f.avatarEditBadge}>
                <MaterialCommunityIcons name="camera-outline" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name + meta */}
          <View style={f.heroMeta}>
            <Text style={f.heroName} numberOfLines={1}>
              {form.tenant_name || 'Tenant'}
            </Text>
            <View style={f.heroPillRow}>
              <View style={f.heroPill}>
                <MaterialCommunityIcons name="home-variant-outline" size={12} color={P.lavenderDeep} />
                <Text style={f.heroPillText}>{form.block}  ·  Flat {form.flat}</Text>
              </View>
              {readOnly && (
                <View style={[f.heroPill, { backgroundColor: P.sage }]}>
                  <MaterialCommunityIcons name="eye-outline" size={12} color={P.sageDeep} />
                  <Text style={[f.heroPillText, { color: P.sageDeep }]}>View only</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── Owner reference ───────────────────────────────────────────────── */}
      <SectionCard style={{ marginTop: 20 }}>
        <SectionHeading
          icon="account-tie-outline"
          label="Owner"
          iconBg={P.lavender}
          iconColor={P.lavenderDeep}
        />
        <TouchableOpacity
          style={f.ownerRow}
          onPress={() => navigation.navigate('OwnerDetails', { propertyId })}
          disabled={!propertyId}
          activeOpacity={0.75}
        >
          <View style={f.ownerLeft}>
            <Text style={f.ownerName}>{form.owner_name || 'View Owner Details'}</Text>
            {form.owner_contact ? (
              <Text style={f.ownerContact}>{form.owner_contact}</Text>
            ) : null}
          </View>
          <View style={f.ownerArrow}>
            <MaterialCommunityIcons name="arrow-right" size={15} color={P.sageDeep} />
          </View>
        </TouchableOpacity>
      </SectionCard>

      {/* ── Personal details ──────────────────────────────────────────────── */}
      <SectionCard style={{ marginTop: 14 }}>
        <SectionHeading
          icon="account-outline"
          label="Personal Details"
          iconBg={P.sky}
          iconColor={P.skyDeep}
        />

        {readOnly ? (
          <>
            <InfoRow
              icon="account-circle-outline"
              label="Tenant Name"
              value={form.tenant_name}
              iconBg={P.sky}
              iconColor={P.skyDeep}
            />
            <View style={f.infoRowDivider} />
            <InfoRow
              icon="phone-outline"
              label="Contact Number"
              value={form.tenant_contact}
              iconBg={P.sky}
              iconColor={P.skyDeep}
            />
            <View style={f.infoRowDivider} />
            <InfoRow
              icon="calendar-outline"
              label="Living Since"
              value={form.tenant_living_from || 'Not set'}
              iconBg={P.sky}
              iconColor={P.skyDeep}
            />
          </>
        ) : (
          <>
            <Field label="Full Name">
              <TextInput
                style={f.input}
                value={form.tenant_name || ''}
                onChangeText={(v) => set('tenant_name', v)}
                placeholder="Enter tenant's full name"
                placeholderTextColor={P.inkTertiary}
              />
            </Field>

            <Field label="Contact Number">
              <TextInput
                style={f.input}
                value={form.tenant_contact || ''}
                onChangeText={(v) => set('tenant_contact', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor={P.inkTertiary}
              />
            </Field>

            <Field label="Living Since">
              <TouchableOpacity
                style={f.dateInput}
                onPress={() => setShowDate(true)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="calendar-outline" size={18} color={P.skyDeep} />
                <Text style={[f.dateInputText, !form.tenant_living_from && { color: P.inkTertiary }]}>
                  {form.tenant_living_from || 'Select a date'}
                </Text>
              </TouchableOpacity>
              {showDate && (
                <DateTimePicker
                  value={safeDateFromIso(form.tenant_living_from || toIsoDate(new Date()))}
                  mode="date"
                  onChange={(event, d) => {
                    if (event.type === 'dismissed') { setShowDate(false); return; }
                    if (d) set('tenant_living_from', toIsoDate(d));
                    setShowDate(false);
                  }}
                />
              )}
            </Field>
          </>
        )}
      </SectionCard>

      {/* ── Vehicles ──────────────────────────────────────────────────────── */}
      <SectionCard style={{ marginTop: 14 }}>
        <SectionHeading
          icon="car-outline"
          label="Registered Vehicles"
          iconBg={P.peach}
          iconColor={P.peachDeep}
          action={
            !readOnly ? (
              <TouchableOpacity style={f.addVehicleBtn} onPress={openAddVehicle} activeOpacity={0.8}>
                <MaterialCommunityIcons name="plus" size={15} color={P.lavenderDeep} />
                <Text style={f.addVehicleTxt}>Add</Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {vehicles.length === 0 ? (
          <View style={f.emptyVehicle}>
            <MaterialCommunityIcons name="car-off" size={22} color={P.inkTertiary} />
            <Text style={f.emptyVehicleText}>No vehicles registered yet.</Text>
          </View>
        ) : (
          <View style={f.vehicleList}>
            {vehicles.map((vehicle, idx) => (
              <TouchableOpacity
                key={`${vehicle.type}-${vehicle.reg}-${idx}`}
                style={f.vehicleCard}
                onPress={() => openEditVehicle(vehicle, idx)}
                disabled={readOnly}
                activeOpacity={0.8}
              >
                <View style={f.vehicleIconWrap}>
                  <MaterialCommunityIcons
                    name={VEHICLE_ICONS[vehicle.type] || 'car-outline'}
                    size={20}
                    color={P.peachDeep}
                  />
                </View>
                <View style={f.vehicleTextGroup}>
                  <Text style={f.vehicleType}>{vehicle.type}</Text>
                  <Text style={f.vehicleReg}>{vehicle.reg}</Text>
                </View>
                {!readOnly && (
                  <TouchableOpacity
                    style={f.vehicleDeleteBtn}
                    onPress={() => removeVehicle(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={P.roseDeep} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Vehicle editor form */}
        {!readOnly && showVehicleForm && (
          <View style={f.vehicleEditor}>
            <Text style={f.vehicleEditorTitle}>
              {editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'}
            </Text>
            <View style={f.pickerWrap}>
              <Picker
                selectedValue={vehicleType}
                onValueChange={(v) => setVehicleType(v)}
                style={{ color: P.ink }}
              >
                {VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
              </Picker>
            </View>
            <TextInput
              style={[f.input, { marginTop: 10 }]}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. KA01AB1234"
              placeholderTextColor={P.inkTertiary}
              autoCapitalize="characters"
            />
            <View style={f.vehicleEditorActions}>
              <TouchableOpacity style={f.saveVehicleBtn} onPress={saveVehicle} activeOpacity={0.85}>
                <Text style={f.saveVehicleTxt}>
                  {editingVehicleIndex === null ? 'Save Vehicle' : 'Update Vehicle'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={f.cancelVehicleBtn}
                onPress={() => { setShowVehicleForm(false); setEditingVehicleIndex(null); setVehicleNumber(''); }}
                activeOpacity={0.75}
              >
                <Text style={f.cancelVehicleTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ── Payment history ───────────────────────────────────────────────── */}
      {paymentHistory.length > 0 && (
        <SectionCard style={{ marginTop: 14 }}>
          <SectionHeading
            icon="cash-multiple"
            label="Guard Payment History"
            iconBg={P.sage}
            iconColor={P.sageDeep}
          />

          {/* Table header */}
          <View style={[f.tableRow, f.tableHead]}>
            {['Month', 'Amount', 'Date', 'Mode'].map((h) => (
              <Text key={h} style={f.tableHeadCell}>{h}</Text>
            ))}
          </View>

          {paymentHistory.map((item, idx) => (
            <View
              key={`${item.year}-${item.month}-${idx}`}
              style={[f.tableRow, idx % 2 === 1 && f.tableRowAlt]}
            >
              <Text style={f.tableCell}>
                {MONTH_NAMES[(item.month || 1) - 1]} {item.year}
              </Text>
              <Text style={[f.tableCell, { color: P.sageDeep, fontWeight: '700' }]}>
                ₹{Math.round(item.amount || 0)}
              </Text>
              <Text style={f.tableCell}>{item.payment_date || '—'}</Text>
              <Text style={f.tableCell}>{item.mode_of_payment || '—'}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {!readOnly && (
        <View style={f.actionsGroup}>
          <TouchableOpacity style={f.saveBtn} onPress={save} activeOpacity={0.85}>
            <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
            <Text style={f.saveTxt}>Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={f.deleteBtn} onPress={del} activeOpacity={0.8}>
            <MaterialCommunityIcons name="trash-can-outline" size={17} color={P.roseDeep} />
            <Text style={f.deleteTxt}>Delete Tenant Record</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 48 }} />
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const f = StyleSheet.create({

  // ── Loading ────────────────────────────────────────────────────────────────
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.inkSecondary,
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: P.lavender,
    borderRadius: R.xxl,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.lavenderMid,
    ...CARD_SHADOW,
  },
  heroBlob1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(79,70,229,0.08)',
    top: -60,
    right: -50,
  },
  heroBlob2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(29,106,240,0.06)',
    bottom: -50,
    left: -40,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: P.lavenderDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: P.lavenderDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  heroMeta: {
    flex: 1,
    gap: 6,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: P.ink,
    letterSpacing: -0.5,
  },
  heroPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.lavenderMid,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: P.lavenderDeep,
  },

  // ── Section card ──────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: P.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  // ── Section heading ───────────────────────────────────────────────────────
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: P.borderFaint,
  },
  sectionHeadingIcon: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },

  // ── Owner row ─────────────────────────────────────────────────────────────
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  ownerLeft: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },
  ownerContact: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: P.inkSecondary,
  },
  ownerArrow: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    backgroundColor: P.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Info row (read-only) ──────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: P.borderFaint,
    marginHorizontal: 16,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: P.inkTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },

  // ── Form fields ───────────────────────────────────────────────────────────
  field: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: P.inkSecondary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: P.surfaceMuted,
    borderWidth: 1.5,
    borderColor: P.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: P.ink,
    marginBottom: 4,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.sky,
    borderWidth: 1.5,
    borderColor: P.skyMid,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateInputText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.ink,
    flex: 1,
  },

  // ── Add vehicle button ────────────────────────────────────────────────────
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.lavender,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addVehicleTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: P.lavenderDeep,
  },

  // ── Vehicle empty ─────────────────────────────────────────────────────────
  emptyVehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyVehicleText: {
    fontSize: 14,
    fontWeight: '500',
    color: P.inkTertiary,
  },

  // ── Vehicle list ──────────────────────────────────────────────────────────
  vehicleList: {
    gap: 1,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: P.borderFaint,
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: P.peach,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vehicleTextGroup: {
    flex: 1,
  },
  vehicleType: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.1,
  },
  vehicleReg: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: P.inkSecondary,
    letterSpacing: 0.5,
  },
  vehicleDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: P.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Vehicle editor ────────────────────────────────────────────────────────
  vehicleEditor: {
    margin: 12,
    padding: 16,
    backgroundColor: P.surfaceMuted,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: P.border,
    gap: 2,
  },
  vehicleEditorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  pickerWrap: {
    backgroundColor: P.surface,
    borderWidth: 1.5,
    borderColor: P.border,
    borderRadius: R.md,
    overflow: 'hidden',
  },
  vehicleEditorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  saveVehicleBtn: {
    flex: 1,
    backgroundColor: P.lavenderDeep,
    borderRadius: R.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveVehicleTxt: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelVehicleBtn: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: R.md,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: P.border,
  },
  cancelVehicleTxt: {
    color: P.inkSecondary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Payment table ─────────────────────────────────────────────────────────
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  tableHead: {
    backgroundColor: P.sage,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: P.sageMid,
  },
  tableHeadCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: P.sageDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRowAlt: {
    backgroundColor: P.surfaceMuted,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '500',
    color: P.inkSecondary,
  },

  // ── Save / Delete ─────────────────────────────────────────────────────────
  actionsGroup: {
    marginTop: 20,
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.lavenderDeep,
    borderRadius: R.xl,
    paddingVertical: 15,
    ...Platform.select({
      ios: { shadowColor: P.lavenderDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  saveTxt: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.rose,
    borderRadius: R.xl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FBCED9',
  },
  deleteTxt: {
    color: P.roseDeep,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});