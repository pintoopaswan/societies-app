import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

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

export default function AddOwnerScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [form, setForm] = useState({ owner_name: '', owner_contact: '' });
  const [flats, setFlats] = useState([]);
  const [showFlatForm, setShowFlatForm] = useState(false);
  const [editingFlatIndex, setEditingFlatIndex] = useState(null);
  const [flatDraft, setFlatDraft] = useState({
    block: BLOCKS[0],
    flat: FLATS[0],
    occupied_by: 'OWNER',
    tenant_name: '',
  });
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

  const openAddFlat = () => {
    resetDraft();
    setEditingFlatIndex(null);
    setShowFlatForm(true);
  };

  const openEditFlat = (idx) => {
    const f = flats[idx];
    if (!f) return;
    setFlatDraft({
      block: f.block || BLOCKS[0],
      flat: f.flat || FLATS[0],
      occupied_by: f.occupied_by || 'OWNER',
      tenant_name: f.tenant_name || '',
    });
    setEditingFlatIndex(idx);
    setShowFlatForm(true);
  };

  const onChangeDraftBlock = (value) => {
    setDraft('block', value);
    lookupTenant(value, flatDraft.flat);
  };

  const onChangeDraftFlat = (value) => {
    setDraft('flat', value);
    lookupTenant(flatDraft.block, value);
  };

  const onChangeDraftOccupancy = (value) => {
    setDraft('occupied_by', value);
    if (value === 'TENANT') lookupTenant(flatDraft.block, flatDraft.flat);
  };

  const ensurePropertyId = async (block, flat) => {
    const lookup = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(block)}&flat=${encodeURIComponent(flat)}&ensure=1`, {}, token);
    if (lookup.data?.property_id) return lookup.data.property_id;

    const created = await apiRequest('/api/tenants', {
      method: 'POST',
      body: JSON.stringify({ block, flat }),
    }, token);
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
    Alert.alert('Delete flat', 'Remove this flat from owner allocation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setFlats((p) => p.filter((_, i) => i !== idx)) },
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
        await apiRequest(
          `/api/owners/${propertyId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              owner_name: form.owner_name.trim(),
              owner_contact: form.owner_contact.trim(),
              is_occupied: f.occupied_by === 'UNOCCUPIED' ? 0 : 1,
              occupied_by: f.occupied_by === 'UNOCCUPIED' ? 'OWNER' : f.occupied_by,
            }),
          },
          token,
        );
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
    <Page>
      <Text style={styles.title}>Add Owner</Text>

      <Text style={styles.label}>Owner Name</Text>
      <TextInput style={styles.input} value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="Enter owner name" />
      <Text style={styles.label}>Owner Contact</Text>
      <TextInput
        style={styles.input}
        value={form.owner_contact}
        onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
        placeholder="Enter owner contact"
        keyboardType="number-pad"
        inputMode="numeric"
        showSoftInputOnFocus
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Flats</Text>
        <TouchableOpacity style={styles.plusBtn} onPress={openAddFlat}><Text style={styles.plusTxt}>+</Text></TouchableOpacity>
      </View>
      {flats.length === 0 ? <Text style={styles.emptyText}>Add at least one flat.</Text> : null}
      <View style={styles.list}>
        {flats.map((f, idx) => (
          <TouchableOpacity key={`${f.block}-${f.flat}-${idx}`} style={styles.flatCard} onPress={() => openEditFlat(idx)}>
            <View style={styles.flatTextWrap}>
              <Text style={styles.flatTitle}>{f.block} | {f.flat}</Text>
              <Text style={styles.flatMeta}>Occupied by: {f.occupied_by === 'UNOCCUPIED' ? 'Unoccupied' : f.occupied_by}</Text>
              {f.occupied_by === 'TENANT' ? <Text style={styles.flatMeta}>Tenant: {tenantLabel(f.tenant_name)}</Text> : null}
            </View>
            <TouchableOpacity style={styles.deleteMiniBtn} onPress={() => removeFlat(idx)}>
              <Text style={styles.deleteMiniTxt}>Delete</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {showFlatForm ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{editingFlatIndex === null ? 'Add Flat' : 'Edit Flat'}</Text>
          <Text style={styles.label}>Block Number</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.block} onValueChange={onChangeDraftBlock}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
          <Text style={styles.label}>Flat Number</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.flat} onValueChange={onChangeDraftFlat}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
          <Text style={styles.label}>Occupied By</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.occupied_by} onValueChange={onChangeDraftOccupancy}>{OCCUPANCY.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}</Picker></View>
          {flatDraft.occupied_by === 'TENANT' ? (
            <>
              <Text style={styles.label}>Tenant Name</Text>
              <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{tenantLabel(flatDraft.tenant_name)}</Text></View>
            </>
          ) : null}
          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.editorBtn} onPress={saveFlat}><Text style={styles.editorBtnTxt}>Save Flat</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowFlatForm(false); setEditingFlatIndex(null); }}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
        <Text style={styles.btnTxt}>{saving ? 'Saving...' : 'Save Owner'}</Text>
      </TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#172b31', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  readOnlyBox: { backgroundColor: '#eef3f8', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  readOnlyText: { color: '#456480', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 6 },
  sectionTitle: { color: '#172b31', fontWeight: '800', fontSize: 18 },
  plusBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#20343a', alignItems: 'center', justifyContent: 'center' },
  plusTxt: { color: '#fff', fontWeight: '800', fontSize: 24, lineHeight: 28 },
  emptyText: { color: '#647d93', marginBottom: 6 },
  list: { gap: 8 },
  flatCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e0d8', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flatTextWrap: { flex: 1, paddingRight: 8 },
  flatTitle: { color: '#172b31', fontWeight: '800' },
  flatMeta: { color: '#647d93', marginTop: 2 },
  deleteMiniBtn: { backgroundColor: '#fff1f1', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  deleteMiniTxt: { color: '#c53030', fontWeight: '700' },
  editor: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e0d8', borderRadius: 10, padding: 10, marginTop: 8 },
  editorTitle: { color: '#172b31', fontWeight: '800', fontSize: 16 },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editorBtn: { flex: 1, backgroundColor: '#20343a', borderRadius: 10, padding: 10 },
  editorBtnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  cancelBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bfd2e6', borderRadius: 10, padding: 10 },
  cancelTxt: { color: '#456480', textAlign: 'center', fontWeight: '700' },
  btn: { backgroundColor: '#20343a', borderRadius: 10, padding: 10, marginTop: 10 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
