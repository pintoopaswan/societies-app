import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
const displayOccupancy = (item) => {
  if (!item?.is_occupied) return 'Unoccupied';
  return String(item?.occupied_by || 'OWNER').toUpperCase() === 'TENANT' ? 'Tenant' : 'Owner';
};

export default function OwnerDetailsScreen() {
  const { token, user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const route = useRoute();
  const propertyId = route.params?.propertyId;
  const readOnly = !!route.params?.readOnly || !canManage;
  const editFlatMode = !!route.params?.editFlat && canManage;
  const [form, setForm] = useState(null);
  const [flats, setFlats] = useState([]);
  const [showFlatForm, setShowFlatForm] = useState(false);
  const [flatDraft, setFlatDraft] = useState({
    block: BLOCKS[0],
    flat: FLATS[0],
    occupied_by: 'OWNER',
    tenant_name: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await apiRequest(`/api/owners/${propertyId}`);
    setForm(res.data);
  }, [propertyId]);

  const loadFlats = useCallback(async (ownerContact) => {
    if (!ownerContact) return setFlats([]);
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(ownerContact)}`);
      setFlats(res.data || []);
    } catch {
      setFlats([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (form?.owner_contact) loadFlats(form.owner_contact);
  }, [form?.owner_contact, loadFlats]);

  useEffect(() => {
    if (!form || !editFlatMode) return;
    setFlatDraft({
      block: form.block || BLOCKS[0],
      flat: form.flat || FLATS[0],
      occupied_by: form.is_occupied ? (form.occupied_by || 'OWNER') : 'UNOCCUPIED',
      tenant_name: form.tenant_name || '',
    });
  }, [editFlatMode, form]);

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

  const openAddFlat = () => {
    const next = { block: BLOCKS[0], flat: FLATS[0], occupied_by: 'OWNER', tenant_name: '' };
    setFlatDraft(next);
    lookupTenant(next.block, next.flat);
    setShowFlatForm(true);
  };

  const saveOwnerInfo = async () => {
    if (!form.owner_name?.trim()) return Alert.alert('Validation', 'Owner Name is required.');
    if (!form.owner_contact?.trim()) return Alert.alert('Validation', 'Owner Contact is required.');
    if (!/^[0-9]{10}$/.test(String(form.owner_contact).trim())) return Alert.alert('Validation', 'Owner Contact must be 10 digits.');
    const rows = flats.length ? flats : [form];
    setSaving(true);
    try {
      for (const item of rows) {
        await apiRequest(
          `/api/owners/${item.property_id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              owner_name: form.owner_name.trim(),
              owner_contact: form.owner_contact.trim(),
              is_occupied: item.is_occupied ? 1 : 0,
              occupied_by: item.occupied_by || 'OWNER',
            }),
          },
          token,
        );
      }
      Alert.alert('Saved', 'Owner details updated');
      const priorityId = rows[0]?.property_id || propertyId;
      navigation.navigate('OwnersList', { priorityPropertyId: priorityId });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveFlat = async () => {
    if (!form.owner_name?.trim()) return Alert.alert('Validation', 'Owner Name is required before saving a flat.');
    if (!form.owner_contact?.trim()) return Alert.alert('Validation', 'Owner Contact is required before saving a flat.');
    if (!flatDraft.block || !flatDraft.flat) return Alert.alert('Validation', 'Select block and flat.');
    setSaving(true);
    try {
      const lookup = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(flatDraft.block)}&flat=${encodeURIComponent(flatDraft.flat)}`);
      const targetPropertyId = lookup.data?.property_id;
      if (!targetPropertyId) throw new Error('Selected flat does not exist.');
      await apiRequest(
        `/api/owners/${targetPropertyId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            owner_name: form.owner_name.trim(),
            owner_contact: form.owner_contact.trim(),
            is_occupied: flatDraft.occupied_by === 'UNOCCUPIED' ? 0 : 1,
            occupied_by: flatDraft.occupied_by === 'UNOCCUPIED' ? 'OWNER' : flatDraft.occupied_by,
          }),
        },
        token,
      );
      if (editFlatMode && Number(targetPropertyId) !== Number(propertyId)) {
        await apiRequest(`/api/owners/${propertyId}`, { method: 'DELETE' }, token);
      }
      setShowFlatForm(false);
      Alert.alert('Saved', 'Flat details updated');
      navigation.navigate('OwnersList', { priorityPropertyId: targetPropertyId });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeFlat = (item) => {
    if (!item) return;
    Alert.alert('Delete flat', `Remove owner assignment from ${item.block} / ${item.flat}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/owners/${item.property_id}`, { method: 'DELETE' }, token);
            await loadFlats(form.owner_contact);
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (!form) return <Page><Text>Loading...</Text></Page>;

  return (
    <Page>
      <Text style={styles.title}>{editFlatMode ? 'Update Flat Details' : 'Owner Details'}</Text>

      <Text style={styles.label}>Owner Name</Text>
      <TextInput style={[styles.input, readOnly && styles.readOnlyInput]} editable={!readOnly} value={form.owner_name || ''} onChangeText={(v) => set('owner_name', v)} />
      <Text style={styles.label}>Owner Contact</Text>
      <TextInput
        style={[styles.input, readOnly && styles.readOnlyInput]}
        editable={!readOnly}
        value={form.owner_contact || ''}
        onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        inputMode="numeric"
        showSoftInputOnFocus
      />

      {editFlatMode ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>Flat</Text>
          <Text style={styles.label}>Block Number</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.block} onValueChange={onChangeDraftBlock}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
          <Text style={styles.label}>Flat Number</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.flat} onValueChange={onChangeDraftFlat}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
          <Text style={styles.label}>Occupied By</Text>
          <View style={styles.pickWrap}><Picker selectedValue={flatDraft.occupied_by} onValueChange={onChangeDraftOccupancy}>{OCCUPANCY.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}</Picker></View>
          <Text style={styles.label}>Tenant Name</Text>
          <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{flatDraft.occupied_by === 'TENANT' ? tenantLabel(flatDraft.tenant_name) : 'Not Available'}</Text></View>
          <TouchableOpacity style={styles.btn} onPress={saveFlat} disabled={saving}><Text style={styles.btnTxt}>{saving ? 'Saving...' : 'Save Flat Details'}</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flats</Text>
            {canManage ? <TouchableOpacity style={styles.plusBtn} onPress={openAddFlat}><Text style={styles.plusTxt}>+</Text></TouchableOpacity> : null}
          </View>
          {(flats || []).length === 0 ? <Text style={styles.emptyText}>No flats allocated to this owner.</Text> : null}
          <View style={styles.list}>
            {(flats || []).map((item) => (
              <TouchableOpacity key={String(item.property_id)} style={styles.flatCard} onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id, readOnly: !canManage, editFlat: canManage })}>
                <View style={styles.flatTextWrap}>
                  <Text style={styles.flatTitle}>{item.block} | {item.flat}</Text>
                  <Text style={styles.flatMeta}>Tenant: {tenantLabel(item.tenant_name)}</Text>
                  <Text style={styles.flatMeta}>Occupied by: {displayOccupancy(item)}</Text>
                </View>
                {canManage ? (
                  <TouchableOpacity style={styles.deleteMiniBtn} onPress={() => removeFlat(item)}>
                    <Text style={styles.deleteMiniTxt}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {showFlatForm && canManage ? (
            <View style={styles.editor}>
              <Text style={styles.editorTitle}>Add Flat</Text>
              <Text style={styles.label}>Block Number</Text>
              <View style={styles.pickWrap}><Picker selectedValue={flatDraft.block} onValueChange={onChangeDraftBlock}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
              <Text style={styles.label}>Flat Number</Text>
              <View style={styles.pickWrap}><Picker selectedValue={flatDraft.flat} onValueChange={onChangeDraftFlat}>{FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}</Picker></View>
              <Text style={styles.label}>Occupied By</Text>
              <View style={styles.pickWrap}><Picker selectedValue={flatDraft.occupied_by} onValueChange={onChangeDraftOccupancy}>{OCCUPANCY.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}</Picker></View>
              <Text style={styles.label}>Tenant Name</Text>
              <View style={styles.readOnlyBox}><Text style={styles.readOnlyText}>{flatDraft.occupied_by === 'TENANT' ? tenantLabel(flatDraft.tenant_name) : 'Not Available'}</Text></View>
              <View style={styles.editorActions}>
                <TouchableOpacity style={styles.editorBtn} onPress={saveFlat} disabled={saving}><Text style={styles.editorBtnTxt}>{saving ? 'Saving...' : 'Save Flat'}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFlatForm(false)}><Text style={styles.cancelTxt}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      )}

      {canManage && !editFlatMode ? <TouchableOpacity style={styles.btn} onPress={saveOwnerInfo} disabled={saving}><Text style={styles.btnTxt}>{saving ? 'Saving...' : 'Save Owner'}</Text></TouchableOpacity> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#172b31', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  readOnlyInput: { backgroundColor: '#eef3f8' },
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
