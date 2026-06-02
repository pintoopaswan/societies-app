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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { safeDateFromIso, toIsoDate } from '../lib/date';

// ─── Design tokens (mirrored from DashboardScreen) ───────────────────────────

const PALETTE = {
  bg:             '#F6F7F9',
  surface:        '#FFFFFF',
  surfaceMuted:   '#F2F4F7',
  ink:            '#0D0F12',
  inkSecondary:   '#5C6470',
  inkTertiary:    '#9EA5B0',
  blue:           '#1D6AF0',
  blueSoft:       '#EBF2FF',
  blueMid:        '#D4E5FD',
  indigo:         '#4F46E5',
  indigoSoft:     '#EEF0FD',
  emerald:        '#059669',
  emeraldSoft:    '#EAFAF4',
  amber:          '#C07818',
  amberSoft:      '#FDF6E8',
  rose:           '#DC2C55',
  roseSoft:       '#FFF0F3',
  slate:          '#475569',
  slateSoft:      '#F0F2F5',
  border:         '#E8EAED',
  borderFaint:    '#F2F4F6',
  overlay:        'rgba(0,0,0,0.40)',
};

const RADIUS = {
  xs:   8,
  sm:   12,
  md:   16,
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

const VEHICLE_TYPES = ['Scooty', 'Bike', 'Car'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Dashboard-style section header */
function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.blue} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Settings list item — same row anatomy as Dashboard activity rows */
function SettingsRow({ icon, iconTone = 'slate', label, value, onPress, isLast, destructive }) {
  const toneMap = {
    blue:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
    green:  { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
    amber:  { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
    red:    { bg: PALETTE.roseSoft,    fg: PALETTE.rose    },
    indigo: { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo  },
    slate:  { bg: PALETTE.slateSoft,   fg: PALETTE.slate   },
  };
  const t = toneMap[iconTone] || toneMap.slate;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.settingsRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <View style={[styles.settingsIcon, { backgroundColor: t.bg }]}>
          <MaterialCommunityIcons name={icon} size={16} color={t.fg} />
        </View>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsLabel, destructive && { color: PALETTE.rose }]}>
            {label}
          </Text>
          {value ? (
            <Text style={styles.settingsValue} numberOfLines={1}>{value}</Text>
          ) : null}
        </View>
        {!destructive && (
          <MaterialCommunityIcons name="chevron-right" size={16} color={PALETTE.inkTertiary} />
        )}
      </Pressable>
      {!isLast && <View style={styles.rowDivider} />}
    </>
  );
}

/** Card container — mirrors Dashboard card style */
function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

/** Inline form field — clean label + input pair */
function FormField({ label, children, isLast }) {
  return (
    <>
      <View style={styles.formField}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
      </View>
      {!isLast && <View style={styles.fieldDivider} />}
    </>
  );
}

/** Logout confirmation modal */
function LogoutModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          <View style={[styles.modalIconWrap, { backgroundColor: PALETTE.roseSoft }]}>
            <MaterialCommunityIcons name="logout" size={22} color={PALETTE.rose} />
          </View>
          <Text style={styles.modalTitle}>Sign out?</Text>
          <Text style={styles.modalSubtitle}>
            You'll need to sign in again to access your account.
          </Text>
          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: PALETTE.rose }]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.modalPrimaryBtnText}>Yes, sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalSecondaryBtn}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const navigation = useNavigation();

  const [showDate,            setShowDate]            = useState(false);
  const [vehicleType,         setVehicleType]         = useState('Car');
  const [vehicleNumber,       setVehicleNumber]       = useState('');
  const [editingVehicleIndex, setEditingVehicleIndex] = useState(null);
  const [showVehicleForm,     setShowVehicleForm]     = useState(false);
  const [vehicles,            setVehicles]            = useState(parseVehicleList(user?.vehicle_list));
  const [flats,               setFlats]               = useState([]);
  const [photoUri,            setPhotoUri]            = useState(user?.photo_url || '');
  const [showLogoutModal,     setShowLogoutModal]     = useState(false);
  const [form, setForm] = useState({
    name:        user?.name        || '',
    mobile:      user?.mobile      || '',
    email:       user?.email       || '',
    living_from: user?.living_from || toIsoDate(new Date()),
  });

  const vehicleListValue = useMemo(() => formatVehicles(vehicles), [vehicles]);
  const profileInitial   = String(form.name || user?.name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const isOwner          = String(user?.role || '').toUpperCase() === 'OWNER';
  const currentHome      = user?.block && user?.flat ? `${user.block} · Flat ${user.flat}` : 'No flat linked';
  const roleLabel        = String(user?.role || '').charAt(0).toUpperCase() + String(user?.role || '').slice(1).toLowerCase();

  // ─── Data loaders ─────────────────────────────────────────────────────────

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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissions needed', 'Allow access to photos to update profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
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
      if (editingVehicleIndex === null) next.push({ type: vehicleType, reg });
      else next[editingVehicleIndex] = { type: vehicleType, reg };
      return next;
    });
    setVehicleNumber('');
    setEditingVehicleIndex(null);
    setShowVehicleForm(false);
  };

  const removeVehicle = (idx) => {
    Alert.alert('Delete vehicle', 'Remove this vehicle from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setVehicles((prev) => prev.filter((_, i) => i !== idx));
          if (editingVehicleIndex === idx) {
            setEditingVehicleIndex(null);
            setShowVehicleForm(false);
            setVehicleNumber('');
          }
        },
      },
    ]);
  };

  const save = async () => {
    if (!form.name.trim())    return Alert.alert('Validation', 'Name is required.');
    if (!form.mobile.trim())  return Alert.alert('Validation', 'Mobile is required.');
    if (!/^[0-9]{10}$/.test(form.mobile.trim()))
      return Alert.alert('Validation', 'Mobile must be 10 digits.');
    if (!form.email.trim())   return Alert.alert('Validation', 'Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return Alert.alert('Validation', 'Email is invalid.');
    if (!form.living_from)    return Alert.alert('Validation', 'Living From date is required.');
    try {
      await updateProfile({ ...form, vehicle_list: vehicleListValue, photo_url: photoUri });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Unable to save', e.message || 'Try again.');
    }
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not sign out. Try again.');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Page>
      {/* ── Profile Header ─────────────────────────────────────────────────── */}
      <Card style={styles.profileHeader}>
        <View style={styles.profileHeaderInner}>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName} numberOfLines={1}>
              {form.name || user?.name || 'Your Name'}
            </Text>
            <View style={styles.profileHomeRow}>
              <View style={[styles.profileHomeBadge, { backgroundColor: PALETTE.blueSoft }]}>
                <MaterialCommunityIcons name="home-outline" size={12} color={PALETTE.blue} />
                <Text style={styles.profileHomeBadgeText}>{currentHome}</Text>
              </View>
              {roleLabel ? (
                <View style={[styles.profileRoleBadge, { backgroundColor: PALETTE.slateSoft }]}>
                  <Text style={styles.profileRoleBadgeText}>{roleLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.profileAvatarImage} />
            ) : (
              <Text style={styles.profileAvatarText}>{profileInitial}</Text>
            )}
            <View style={styles.profileAvatarBadge}>
              <MaterialCommunityIcons name="camera-outline" size={10} color={PALETTE.blue} />
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── Account Settings ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Account Settings" />
        <Card>
          <FormField label="Name">
            <TextInput
              style={styles.fieldInput}
              placeholder="Full name"
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholderTextColor={PALETTE.inkTertiary}
            />
          </FormField>
          <FormField label="Mobile">
            <TextInput
              style={styles.fieldInput}
              placeholder="10-digit mobile"
              value={form.mobile}
              onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholderTextColor={PALETTE.inkTertiary}
            />
          </FormField>
          <FormField label="Email" isLast>
            <TextInput
              style={styles.fieldInput}
              placeholder="Email address"
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={PALETTE.inkTertiary}
            />
          </FormField>
        </Card>
      </View>

      {/* ── Society Information ────────────────────────────────────────────── */}
      {isOwner && (
        <View style={styles.section}>
          <SectionHeader title="Society Information" />
          <Card>
            {flats.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
                  <MaterialCommunityIcons name="home-city-outline" size={20} color={PALETTE.blue} />
                </View>
                <Text style={styles.emptyTitle}>No flats assigned</Text>
                <Text style={styles.emptyBody}>
                  Once your homes are linked, they'll appear here.
                </Text>
              </View>
            ) : (
              flats.map((flat, idx) => (
                <React.Fragment key={String(flat.property_id)}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('TenantDetails', {
                        propertyId: flat.property_id,
                        readOnly:   true,
                        snapshot:   flat,
                      })
                    }
                    style={({ pressed }) => [
                      styles.settingsRow,
                      { opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <View style={[styles.settingsIcon, { backgroundColor: PALETTE.blueSoft }]}>
                      <MaterialCommunityIcons name="home-city-outline" size={16} color={PALETTE.blue} />
                    </View>
                    <View style={styles.settingsContent}>
                      <Text style={styles.settingsLabel}>
                        {flat.block} · Flat {flat.flat}
                      </Text>
                      <Text style={styles.settingsValue} numberOfLines={1}>
                        {flat.tenant_name ? `Tenant: ${flat.tenant_name}` : 'No tenant'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={PALETTE.inkTertiary} />
                  </Pressable>
                  {idx < flats.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))
            )}
          </Card>
        </View>
      )}

      {/* ── Preferences (Vehicles) ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Preferences"
          actionLabel="Add vehicle"
          onAction={openAddVehicle}
        />
        <Card>
          <FormField label="Living from" isLast={vehicles.length === 0}>
            <TouchableOpacity
              style={styles.datePickerRow}
              onPress={() => setShowDate(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.datePickerText}>{form.living_from}</Text>
              <MaterialCommunityIcons name="calendar-outline" size={16} color={PALETTE.inkTertiary} />
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(event, d) => {
                  if (event.type === 'dismissed') { setShowDate(false); return; }
                  if (d) setForm((p) => ({ ...p, living_from: toIsoDate(d) }));
                  setShowDate(false);
                }}
              />
            )}
          </FormField>

          {vehicles.map((vehicle, idx) => (
            <React.Fragment key={`${vehicle.type}-${vehicle.reg}-${idx}`}>
              <View style={styles.rowDivider} />
              <Pressable
                onPress={() => openEditVehicle(vehicle, idx)}
                style={({ pressed }) => [styles.settingsRow, { opacity: pressed ? 0.82 : 1 }]}
              >
                <View style={[styles.settingsIcon, { backgroundColor: PALETTE.slateSoft }]}>
                  <MaterialCommunityIcons
                    name={vehicle.type === 'Car' ? 'car-outline' : vehicle.type === 'Bike' ? 'motorbike' : 'scooter'}
                    size={16}
                    color={PALETTE.slate}
                  />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsLabel}>{vehicle.type}</Text>
                  <Text style={styles.settingsValue}>{vehicle.reg}</Text>
                </View>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => removeVehicle(idx)}
                  style={[styles.deleteChip, { backgroundColor: PALETTE.roseSoft }]}
                >
                  <Text style={styles.deleteChipText}>Remove</Text>
                </TouchableOpacity>
              </Pressable>
            </React.Fragment>
          ))}
        </Card>

        {/* Vehicle editor */}
        {showVehicleForm && (
          <Card style={styles.vehicleEditor}>
            <Text style={styles.editorTitle}>
              {editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'}
            </Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
                {VEHICLE_TYPES.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>
            <TextInput
              style={styles.fieldInput}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="e.g. KA01AB1234"
              placeholderTextColor={PALETTE.inkTertiary}
              autoCapitalize="characters"
            />
            <View style={styles.editorActions}>
              <TouchableOpacity
                style={[styles.editorPrimaryBtn, { backgroundColor: PALETTE.blue }]}
                onPress={saveVehicle}
                activeOpacity={0.85}
              >
                <Text style={styles.editorPrimaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editorSecondaryBtn}
                onPress={() => {
                  setShowVehicleForm(false);
                  setEditingVehicleIndex(null);
                  setVehicleNumber('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.editorSecondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>

      {/* ── Help & Support ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Help & Support" />
        <Card>
          <SettingsRow
            icon="help-circle-outline"
            iconTone="blue"
            label="FAQ & Help Centre"
            value="Guides and common questions"
            onPress={() => {}}
          />
          <SettingsRow
            icon="message-text-outline"
            iconTone="green"
            label="Contact Support"
            value="Reach the management team"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-check-outline"
            iconTone="indigo"
            label="Privacy Policy"
            onPress={() => {}}
          />
          <SettingsRow
            icon="file-document-outline"
            iconTone="slate"
            label="Terms of Service"
            onPress={() => {}}
            isLast
          />
        </Card>
      </View>

      {/* ── Save button ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={save}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="check" size={16} color="#fff" />
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>

      {/* ── Logout ─────────────────────────────────────────────────────────── */}
      <View style={[styles.section, styles.logoutSection]}>
        <Card>
          <Pressable
            onPress={() => setShowLogoutModal(true)}
            style={({ pressed }) => [styles.logoutRow, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.settingsIcon, { backgroundColor: PALETTE.roseSoft }]}>
              <MaterialCommunityIcons name="logout" size={16} color={PALETTE.rose} />
            </View>
            <Text style={styles.logoutLabel}>Sign out</Text>
          </Pressable>
        </Card>
        <Text style={styles.versionText}>
          {user?.name ? `Signed in as ${user.name}` : 'Society App'}
        </Text>
      </View>

      {/* ── Logout confirmation modal ───────────────────────────────────────── */}
      <LogoutModal
        visible={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Profile header ────────────────────────────────────────────────────────
  profileHeader: {
    marginBottom: 0,
  },
  profileHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  profileHomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  profileHomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  profileHomeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
    letterSpacing: -0.1,
  },
  profileRoleBadge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  profileRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.slate,
    letterSpacing: 0.2,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: PALETTE.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  profileAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  profileAvatarBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.surface,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 20,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  // ── Settings rows ─────────────────────────────────────────────────────────
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: PALETTE.borderFaint,
    marginHorizontal: 16,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsContent: {
    flex: 1,
    minWidth: 0,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: PALETTE.ink,
    letterSpacing: -0.1,
  },
  settingsValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Form fields ───────────────────────────────────────────────────────────
  formField: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 11,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: PALETTE.borderFaint,
    marginHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    color: PALETTE.ink,
    paddingVertical: 0,
    minHeight: 24,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: 15,
    fontWeight: '500',
    color: PALETTE.ink,
  },

  // ── Vehicle editor ────────────────────────────────────────────────────────
  vehicleEditor: {
    padding: 16,
    marginTop: 10,
  },
  editorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.ink,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  pickerWrap: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: PALETTE.surfaceMuted,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editorPrimaryBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editorPrimaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  editorSecondaryBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  editorSecondaryBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: PALETTE.ink,
  },
  deleteChip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  deleteChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.rose,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.ink,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    textAlign: 'center',
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtn: {
    marginTop: 20,
    backgroundColor: PALETTE.blue,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...CARD_SHADOW,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutSection: {
    marginBottom: 12,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  logoutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: PALETTE.rose,
    flex: 1,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkTertiary,
    marginTop: 4,
  },

  // ── Logout modal ──────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: PALETTE.overlay,
    padding: 12,
  },
  modalSheet: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.border,
    marginBottom: 20,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalPrimaryBtn: {
    width: '100%',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    width: '100%',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  modalSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.ink,
  },
});