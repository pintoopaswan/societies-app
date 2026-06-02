import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

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
  overlay: 'rgba(0,0,0,0.45)',
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
const OCCUPANCY = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Tenant', value: 'TENANT' },
  { label: 'Unoccupied', value: 'UNOCCUPIED' },
];

const tenantLabel = (name) => (name || '').trim() || 'Not Available';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function InputField({ value, onChangeText, placeholder, keyboardType, inputMode }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={PALETTE.inkTertiary}
      keyboardType={keyboardType}
      inputMode={inputMode}
    />
  );
}

function ReadOnlyField({ value, icon, iconColor = PALETTE.emerald }) {
  return (
    <View style={styles.readOnlyBox}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} style={{ marginRight: 8 }} />
      ) : null}
      <Text style={[styles.readOnlyText, { color: iconColor }]}>{value}</Text>
    </View>
  );
}

function PickerField({ children }) {
  return <View style={styles.pickWrap}>{children}</View>;
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

function OccupancyPill({ value }) {
  const map = {
    OWNER:      { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
    TENANT:     { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
    UNOCCUPIED: { bg: PALETTE.surfaceMuted,fg: PALETTE.inkSecondary },
  };
  const c = map[value] || map.UNOCCUPIED;
  const label = value === 'UNOCCUPIED' ? 'Unoccupied' : value;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function FlatCard({ flat, index, onEdit, onDelete }) {
  return (
    <Pressable
      onPress={() => onEdit(index)}
      style={({ pressed }) => [styles.flatCard, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
    >
      <View style={styles.flatCardIcon}>
        <MaterialCommunityIcons name="home-city-outline" size={20} color={PALETTE.blue} />
      </View>
      <View style={styles.flatCardContent}>
        <Text style={styles.flatCardTitle}>{flat.block} · {flat.flat}</Text>
        <View style={styles.flatCardMetaRow}>
          <OccupancyPill value={flat.occupied_by} />
          {flat.occupied_by === 'TENANT' ? (
            <Text style={styles.flatCardMeta}>Tenant: {tenantLabel(flat.tenant_name)}</Text>
          ) : null}
        </View>
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

export default function AddOwnerScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [form, setForm] = useState({ owner_name: '', owner_contact: '' });
  const [flats, setFlats] = useState([]);
  const [showFlatForm, setShowFlatForm] = useState(false);
  const [editingFlatIndex, setEditingFlatIndex] = useState(null);
  const [flatDraft, setFlatDraft] = useState({ block: BLOCKS[0], flat: FLATS[0], occupied_by: 'OWNER', tenant_name: '' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setDraft = (k, v) => setFlatDraft((p) => ({ ...p, [k]: v }));

  const lookupTenant = async (block, flat) => {
    try {
      const res = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(block)}&flat=${encodeURIComponent(flat)}`);
      setDraft('tenant_name', res.data?.tenant_name || '');
    } catch {
      setDraft('tenant_name', '');
    }
  };

  const resetDraft = () => {
    const next = { block: BLOCKS[0], flat: FLATS[0], occupied_by: 'OWNER', tenant_name: '' };
    setFlatDraft(next);
    lookupTenant(next.block, next.flat);
  };

  const openAddFlat = () => { resetDraft(); setEditingFlatIndex(null); setShowFlatForm(true); };
  const openEditFlat = (idx) => {
    const f = flats[idx];
    if (!f) return;
    setFlatDraft({ block: f.block || BLOCKS[0], flat: f.flat || FLATS[0], occupied_by: f.occupied_by || 'OWNER', tenant_name: f.tenant_name || '' });
    setEditingFlatIndex(idx);
    setShowFlatForm(true);
  };

  const onChangeDraftBlock = (value) => { setDraft('block', value); lookupTenant(value, flatDraft.flat); };
  const onChangeDraftFlat = (value) => { setDraft('flat', value); lookupTenant(flatDraft.block, value); };
  const onChangeDraftOccupancy = (value) => {
    setDraft('occupied_by', value);
    if (value === 'TENANT') lookupTenant(flatDraft.block, flatDraft.flat);
  };

  const ensurePropertyId = async (block, flat) => {
    const lookup = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(block)}&flat=${encodeURIComponent(flat)}&ensure=1`, {}, token);
    if (lookup.data?.property_id) return lookup.data.property_id;
    const created = await apiRequest('/api/tenants', { method: 'POST', body: JSON.stringify({ block, flat }) }, token);
    const propertyId = created.property_id;
    if (!propertyId) throw new Error(`Unable to create flat ${block} / ${flat}.`);
    return propertyId;
  };

  const saveFlat = () => {
    if (!flatDraft.block || !flatDraft.flat) return Alert.alert('Validation', 'Select block and flat.');
    setFlats((prev) => {
      const next = [...prev];
      const duplicate = next.find((x, idx) => idx !== editingFlatIndex && x.block === flatDraft.block && x.flat === flatDraft.flat);
      if (duplicate) return next;
      const value = { ...flatDraft };
      if (editingFlatIndex === null) next.push(value);
      else next[editingFlatIndex] = value;
      return next;
    });
    setShowFlatForm(false);
    setEditingFlatIndex(null);
  };

  const removeFlat = (idx) => {
    Alert.alert('Remove flat', 'Remove this flat from owner allocation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setFlats((p) => p.filter((_, i) => i !== idx)) },
    ]);
  };

  const save = async () => {
    if (!form.owner_name.trim()) return Alert.alert('Validation', 'Owner Name is required.');
    if (!form.owner_contact.trim()) return Alert.alert('Validation', 'Owner Contact is required.');
    if (!/^[0-9]{10}$/.test(form.owner_contact.trim())) return Alert.alert('Validation', 'Owner Contact must be 10 digits.');
    if (!flats.length) return Alert.alert('Validation', 'Add at least one flat.');
    setSaving(true);
    try {
      let firstUpdatedPropertyId = null;
      for (const f of flats) {
        const propertyId = await ensurePropertyId(f.block, f.flat);
        if (!firstUpdatedPropertyId) firstUpdatedPropertyId = propertyId;
        await apiRequest(`/api/owners/${propertyId}`, {
          method: 'PUT',
          body: JSON.stringify({
            owner_name: form.owner_name.trim(),
            owner_contact: form.owner_contact.trim(),
            is_occupied: f.occupied_by === 'UNOCCUPIED' ? 0 : 1,
            occupied_by: f.occupied_by === 'UNOCCUPIED' ? 'OWNER' : f.occupied_by,
          }),
        }, token);
      }
      Alert.alert('Saved', 'Owner details saved successfully.');
      navigation.navigate('OwnersList', { priorityPropertyId: firstUpdatedPropertyId });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page style={{ backgroundColor: PALETTE.bg }}>
      {/* ── Page header ── */}
      <View style={styles.pageHeader}>
        <View style={[styles.pageIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
          <MaterialCommunityIcons name="account-plus-outline" size={24} color={PALETTE.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>RESIDENTS</Text>
          <Text style={styles.title}>Add Owner</Text>
        </View>
      </View>

      {/* ── Owner details card ── */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Owner Details</Text>
        <FieldLabel>Full Name</FieldLabel>
        <InputField value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="Enter owner name" />
        <FieldLabel>Contact Number</FieldLabel>
        <InputField
          value={form.owner_contact}
          onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
          placeholder="10-digit mobile number"
          keyboardType="number-pad"
          inputMode="numeric"
        />
      </View>

      {/* ── Flats section ── */}
      <SectionHeader title="Flat Allocations" onAdd={openAddFlat} />

      {flats.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
            <MaterialCommunityIcons name="home-plus-outline" size={26} color={PALETTE.blue} />
          </View>
          <Text style={styles.emptyTitle}>No flats added yet</Text>
          <Text style={styles.emptyBody}>Tap "Add" above to assign a flat to this owner.</Text>
        </View>
      ) : (
        <View style={styles.flatList}>
          {flats.map((f, idx) => (
            <FlatCard key={`${f.block}-${f.flat}-${idx}`} flat={f} index={idx} onEdit={openEditFlat} onDelete={removeFlat} />
          ))}
        </View>
      )}

      {/* ── Flat editor ── */}
      {showFlatForm ? (
        <EditorSheet title={editingFlatIndex === null ? 'Add Flat' : 'Edit Flat'}>
          <FieldLabel>Block Number</FieldLabel>
          <PickerField>
            <Picker selectedValue={flatDraft.block} onValueChange={onChangeDraftBlock}>
              {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
            </Picker>
          </PickerField>

          <FieldLabel>Flat Number</FieldLabel>
          <PickerField>
            <Picker selectedValue={flatDraft.flat} onValueChange={onChangeDraftFlat}>
              {FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}
            </Picker>
          </PickerField>

          <FieldLabel>Occupied By</FieldLabel>
          <PickerField>
            <Picker selectedValue={flatDraft.occupied_by} onValueChange={onChangeDraftOccupancy}>
              {OCCUPANCY.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}
            </Picker>
          </PickerField>

          {flatDraft.occupied_by === 'TENANT' ? (
            <>
              <FieldLabel>Tenant Name</FieldLabel>
              <ReadOnlyField value={tenantLabel(flatDraft.tenant_name)} icon="account-outline" iconColor={PALETTE.emerald} />
            </>
          ) : null}

          <View style={styles.editorActions}>
            <Pressable
              onPress={saveFlat}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <MaterialCommunityIcons name="check" size={18} color="#fff" />
              <Text style={styles.primaryBtnTxt}>Save Flat</Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowFlatForm(false); setEditingFlatIndex(null); }}
              style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.ghostBtnTxt}>Cancel</Text>
            </Pressable>
          </View>
        </EditorSheet>
      ) : null}

      {/* ── Save button ── */}
      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {saving ? (
          <Text style={styles.saveBtnTxt}>Saving…</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="content-save-outline" size={19} color="#fff" />
            <Text style={styles.saveBtnTxt}>Save Owner</Text>
          </>
        )}
      </Pressable>
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  pageIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: PALETTE.inkTertiary, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.6, marginTop: 2 },

  // Card
  card: { backgroundColor: PALETTE.surface, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: PALETTE.border, padding: 18, marginBottom: 18, ...CARD_SHADOW },
  cardHeading: { fontSize: 15, fontWeight: '800', color: PALETTE.ink, letterSpacing: -0.2, marginBottom: 12 },

  // Labels / inputs
  label: { fontSize: 11, fontWeight: '800', color: PALETTE.inkSecondary, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: PALETTE.surfaceMuted, borderWidth: 1.5, borderColor: PALETTE.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: PALETTE.ink, marginBottom: 10 },
  pickWrap: { backgroundColor: PALETTE.surfaceMuted, borderWidth: 1.5, borderColor: PALETTE.border, borderRadius: RADIUS.md, marginBottom: 10, overflow: 'hidden' },
  readOnlyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.emeraldSoft, borderWidth: 1.5, borderColor: '#A7F3D0', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  readOnlyText: { fontSize: 15, fontWeight: '700' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.3 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PALETTE.ink, borderRadius: RADIUS.pill, paddingVertical: 8, paddingHorizontal: 14 },
  addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Flat list
  flatList: { gap: 10, marginBottom: 4 },
  flatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: PALETTE.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: PALETTE.border, padding: 14, gap: 12, ...CARD_SHADOW },
  flatCardIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: PALETTE.blueSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  flatCardContent: { flex: 1, minWidth: 0 },
  flatCardTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink, letterSpacing: -0.2 },
  flatCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  flatCardMeta: { fontSize: 12, fontWeight: '600', color: PALETTE.inkSecondary },
  iconBtn: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },

  // Pill
  pill: { borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  emptyIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: PALETTE.ink },
  emptyBody: { fontSize: 13, lineHeight: 19, fontWeight: '500', color: PALETTE.inkSecondary, textAlign: 'center' },

  // Editor sheet
  editorSheet: { backgroundColor: PALETTE.surface, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: PALETTE.border, padding: 18, marginTop: 8, marginBottom: 8, ...CARD_SHADOW },
  editorHandle: { width: 36, height: 4, borderRadius: RADIUS.pill, backgroundColor: PALETTE.border, alignSelf: 'center', marginBottom: 14 },
  editorTitle: { fontSize: 17, fontWeight: '900', color: PALETTE.ink, letterSpacing: -0.3, marginBottom: 12 },
  editorActions: { flexDirection: 'row', gap: 10, marginTop: 6 },

  // Buttons
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PALETTE.blue, borderRadius: RADIUS.md, paddingVertical: 13 },
  primaryBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ghostBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: PALETTE.border, paddingVertical: 13 },
  ghostBtnTxt: { color: PALETTE.inkSecondary, fontSize: 14, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PALETTE.ink, borderRadius: RADIUS.xl, paddingVertical: 16, marginTop: 10 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
});