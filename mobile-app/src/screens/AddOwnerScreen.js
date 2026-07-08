import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
  EmptyState,
} from '../components/DesignSystem';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);
const OCCUPANCY = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Tenant', value: 'TENANT' },
  { label: 'Unoccupied', value: 'UNOCCUPIED' },
];

export default function AddOwnerScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors } = useAppTheme();
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

  const openAddFlat = () => {
    setFlatDraft({ block: BLOCKS[0], flat: FLATS[0], occupied_by: 'OWNER', tenant_name: '' });
    lookupTenant(BLOCKS[0], FLATS[0]);
    setEditingFlatIndex(null);
    setShowFlatForm(true);
  };

  const openEditFlat = (idx) => {
    setFlatDraft({ ...flats[idx] });
    setEditingFlatIndex(idx);
    setShowFlatForm(true);
  };

  const saveFlat = () => {
    setFlats((prev) => {
      const next = [...prev];
      if (editingFlatIndex === null) next.push({ ...flatDraft });
      else next[editingFlatIndex] = { ...flatDraft };
      return next;
    });
    setShowFlatForm(false);
  };

  const removeFlat = (idx) => {
    Alert.alert('Remove flat', 'Remove this flat from allocation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setFlats((p) => p.filter((_, i) => i !== idx)) },
    ]);
  };

  const submit = async () => {
    if (!form.owner_name.trim() || !form.owner_contact.trim() || !flats.length) {
      return Alert.alert('Validation', 'Name, contact and at least one flat are required.');
    }
    setSaving(true);
    try {
      for (const f of flats) {
        const lookup = await apiRequest(`/api/owner-lookup?block=${encodeURIComponent(f.block)}&flat=${encodeURIComponent(f.flat)}&ensure=1`, {}, token);
        const propertyId = lookup.data?.property_id;
        if (!propertyId) throw new Error(`Could not link ${f.block} ${f.flat}`);
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
      Alert.alert('Saved', 'Owner details updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Administration</Text>
        <Text style={[styles.title, { color: colors.text }]}>Add Owner</Text>
      </View>

      <Surface style={styles.card}>
        <FormField label="Full Name*">
          <FormInput value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="Owner name" />
        </FormField>
        <FormField label="Contact Number*" isLast>
          <FormInput
            value={form.owner_contact}
            onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
            placeholder="10-digit mobile"
            keyboardType="number-pad"
          />
        </FormField>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Flat Allocations" actionLabel="Add Flat" onAction={openAddFlat} />
        {flats.length === 0 ? (
          <EmptyState icon="home-plus-outline" title="No flats added" subtitle="Assign at least one flat to this owner." />
        ) : (
          flats.map((f, idx) => (
            <Surface key={idx} style={styles.flatRow}>
              <View style={styles.flatMain}>
                <Text style={[styles.flatTitle, { color: colors.text }]}>{f.block} · {f.flat}</Text>
                <View style={styles.flatBadgeRow}>
                  <Badge label={f.occupied_by} tone={f.occupied_by === 'OWNER' ? 'info' : f.occupied_by === 'TENANT' ? 'success' : 'neutral'} />
                  {f.tenant_name ? <Text style={[styles.tenantName, { color: colors.muted }]}>· {f.tenant_name}</Text> : null}
                </View>
              </View>
              <View style={styles.flatActions}>
                <TouchableOpacity onPress={() => openEditFlat(idx)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryBlue} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFlat(idx)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </Surface>
          ))
        )}
      </View>

      {showFlatForm && (
        <Surface style={styles.editor}>
          <Text style={[styles.editorTitle, { color: colors.text }]}>{editingFlatIndex === null ? 'New Flat' : 'Edit Flat'}</Text>
          <View style={styles.row}>
            <FormField label="Block" style={{ flex: 1 }}>
              <FormPicker value={flatDraft.block} onValueChange={(v) => { setDraft('block', v); lookupTenant(v, flatDraft.flat); }} items={BLOCKS.map(b => ({ label: b, value: b }))} />
            </FormField>
            <View style={{ width: 10 }} />
            <FormField label="Flat" style={{ flex: 1 }}>
              <FormPicker value={flatDraft.flat} onValueChange={(v) => { setDraft('flat', v); lookupTenant(flatDraft.block, v); }} items={FLATS.map(f => ({ label: f, value: f }))} />
            </FormField>
          </View>
          <FormField label="Occupancy">
            <FormPicker value={flatDraft.occupied_by} onValueChange={(v) => setDraft('occupied_by', v)} items={OCCUPANCY} />
          </FormField>
          {flatDraft.occupied_by === 'TENANT' && (
            <FormField label="Linked Tenant">
              <Surface tone="soft" style={styles.readOnly}>
                <Text style={[styles.readOnlyText, { color: colors.muted }]}>{flatDraft.tenant_name || 'No tenant found'}</Text>
              </Surface>
            </FormField>
          )}
          <View style={styles.editorActions}>
            <FormButton title="Save Flat" onPress={saveFlat} />
            <FormButton title="Cancel" onPress={() => setShowFlatForm(false)} tone="secondary" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Save Owner Record" onPress={submit} loading={saving} />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  card: { padding: 20 },
  section: { marginTop: 24 },
  flatRow: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  flatMain: { flex: 1 },
  flatTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  flatBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tenantName: { fontSize: 13, fontWeight: '500' },
  flatActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  editor: { padding: 20, marginTop: 12 },
  editorTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  row: { flexDirection: 'row' },
  readOnly: { padding: 12, borderRadius: 10 },
  readOnlyText: { fontWeight: '600' },
  editorActions: { gap: 10, marginTop: 16 },
  actions: { marginTop: 32, paddingBottom: 40 },
});
