import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { safeDateFromIso, toIsoDate } from '../lib/date';
import { radius, shadow, typography, useAppTheme } from '../lib/theme';

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

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={[styles.sectionAction, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <Text style={[styles.sectionActionText, { color: colors.text }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StatPill({ label, value }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <Text style={[styles.statPillLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statPillValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const navigation = useNavigation();
  const { colors } = useAppTheme();
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
  const currentHome = user?.block && user?.flat ? `${user.block} ${user.flat}` : 'No flat linked';

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
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroKicker, { color: colors.muted }]}>PROFILE</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Your account, presented with calm clarity</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Update identity, vehicles, and home context without the clutter of a dense settings page.
            </Text>
          </View>
          <TouchableOpacity style={[styles.avatar, { backgroundColor: colors.primaryBlue }]} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profileInitial}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroStats}>
          <StatPill label="Role" value={String(user?.role || '-').toUpperCase()} />
          <StatPill label="Home" value={currentHome} />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Account Details" subtitle="Personal information used across the application." />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholderTextColor={colors.muted} />
          <Text style={[styles.label, { color: colors.muted }]}>Mobile</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Mobile"
            value={form.mobile}
            onChangeText={(v) => setForm((p) => ({ ...p, mobile: v.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholderTextColor={colors.muted}
          />
          <Text style={[styles.label, { color: colors.muted }]}>Email</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} autoCapitalize="none" placeholderTextColor={colors.muted} />
        </View>
      </View>

      {isOwner ? (
        <View style={styles.sectionBlock}>
          <SectionHeader title="Assigned Flats" subtitle="Homes linked to this account, styled as tappable cards." />
          <View style={styles.stack}>
            {flats.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No flats assigned</Text>
                <Text style={[styles.emptyCopy, { color: colors.muted }]}>Once your homes are linked, they’ll appear here for quick access.</Text>
              </View>
            ) : (
              flats.map((flat) => (
                <TouchableOpacity
                  key={String(flat.property_id)}
                  style={[styles.flatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('TenantDetails', { propertyId: flat.property_id, readOnly: true, snapshot: flat })}
                >
                  <View>
                    <Text style={[styles.flatTitle, { color: colors.text }]}>{flat.block} | {flat.flat}</Text>
                    <Text style={[styles.flatMeta, { color: colors.muted }]}>Tenant: {flat.tenant_name || 'Not Available'}</Text>
                    <Text style={[styles.flatMeta, { color: colors.muted }]}>Occupied by: {String(flat.occupied_by || 'OWNER').toUpperCase() === 'TENANT' ? 'Tenant' : flat.is_occupied ? 'Owner' : 'Unoccupied'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Vehicles"
          subtitle="Manage your vehicles in a tidy card-based editor."
          actionLabel="Add vehicle"
          onAction={openAddVehicle}
        />
        <View style={styles.stack}>
          {vehicles.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No vehicles added</Text>
              <Text style={[styles.emptyCopy, { color: colors.muted }]}>Add a vehicle so it’s easier to keep your profile complete.</Text>
            </View>
          ) : (
            vehicles.map((vehicle, idx) => (
              <TouchableOpacity key={`${vehicle.type}-${vehicle.reg}-${idx}`} style={[styles.vehicleCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openEditVehicle(vehicle, idx)}>
                <View>
                  <Text style={[styles.vehicleTitle, { color: colors.text }]}>{vehicle.type}</Text>
                  <Text style={[styles.vehicleMeta, { color: colors.muted }]}>{vehicle.reg}</Text>
                </View>
                <TouchableOpacity style={[styles.deleteMiniBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={() => removeVehicle(idx)}>
                  <Text style={[styles.deleteMiniTxt, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {showVehicleForm ? (
        <View style={styles.sectionBlock}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title={editingVehicleIndex === null ? 'Add Vehicle' : 'Edit Vehicle'} subtitle="Update the type and registration details." />
            <View style={[styles.pickerWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker selectedValue={vehicleType} onValueChange={setVehicleType}>
                {VEHICLE_TYPES.map((t) => <Picker.Item key={t} label={t} value={t} />)}
              </Picker>
            </View>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA01AB1234" placeholderTextColor={colors.muted} />
            <View style={styles.editorActions}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primaryBlue }]} onPress={saveVehicle}>
                <Text style={styles.primaryBtnText}>Save Vehicle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={() => { setShowVehicleForm(false); setEditingVehicleIndex(null); setVehicleNumber(''); }}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            {editingVehicleIndex !== null ? (
              <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={() => removeVehicle(editingVehicleIndex)}>
                <Text style={[styles.dangerBtnText, { color: colors.danger }]}>Delete Vehicle</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <SectionHeader title="Living From" subtitle="The date used across your resident profile." />
        <TouchableOpacity style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDate(true)}>
          <Text style={{ color: colors.text }}>{form.living_from}</Text>
        </TouchableOpacity>
        {showDate ? (
          <DateTimePicker
            value={safeDateFromIso(form.living_from)}
            mode="date"
            onChange={(event, d) => {
              if (event.type === 'dismissed') {
                setShowDate(false);
                return;
              }
              if (d) setForm((p) => ({ ...p, living_from: toIsoDate(d) }));
              setShowDate(false);
            }}
          />
        ) : null}
      </View>

      <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primaryBlue }]} onPress={save}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    fontFamily: typography.heading,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statPill: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statPillValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontFamily: typography.heading,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionAction: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 50,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  flatCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flatTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  flatMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  stack: {
    gap: 10,
  },
  vehicleCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  vehicleMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  deleteMiniBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  deleteMiniTxt: {
    fontWeight: '800',
  },
  editorCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  pickerWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: '900',
  },
  dangerBtn: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerBtnText: {
    fontWeight: '900',
  },
  dateField: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 18,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
});
