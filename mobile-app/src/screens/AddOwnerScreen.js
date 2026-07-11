import React, { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
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
  { label: 'Owner-Occupied', value: 'OWNER' },
  { label: 'Tenant-Occupied', value: 'TENANT' },
  { label: 'Vacant', value: 'UNOCCUPIED' },
];

export default function AddOwnerScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { colors, radius } = useAppTheme();

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
      Alert.alert('Saved', 'Owner records updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <SectionHeader title="Property Registration" subtitle="Register a new flat owner." />

      <Surface level={1} style={styles.card}>
        <FormField label="Owner Full Name">
          <FormInput value={form.owner_name} onChangeText={(v) => set('owner_name', v)} placeholder="e.g. John Doe" />
        </FormField>
        <FormField label="Primary Contact Number" isLast>
          <FormInput
            value={form.owner_contact}
            onChangeText={(v) => set('owner_contact', v.replace(/[^0-9]/g, ''))}
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
          />
        </FormField>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Flat Allocations" actionLabel="Add Unit" onAction={openAddFlat} icon="plus" />

        {flats.length === 0 ? (
          <EmptyState
            icon="home-plus"
            title="No units assigned"
            subtitle="Please assign at least one flat to this owner."
            actionLabel="Add Flat"
            onAction={openAddFlat}
          />
        ) : (
          <View style={styles.flatList}>
            {flats.map((f, idx) => (
              <Surface key={idx} level={1} style={styles.flatRow}>
                <View style={styles.flatInfo}>
                  <Badge label={`${f.block} · ${f.flat}`} tone="info" />
                  <View style={styles.occupancyRow}>
                    <Badge
                      label={f.occupied_by === 'UNOCCUPIED' ? 'Vacant' : (f.occupied_by === 'TENANT' ? 'Tenant' : 'Owner')}
                      tone={f.occupied_by === 'TENANT' ? 'success' : (f.occupied_by === 'UNOCCUPIED' ? 'warning' : 'info')}
                    />
                    {f.tenant_name ? <Badge label={f.tenant_name} tone="neutral" /> : null}
                  </View>
                </View>
                <View style={styles.flatActions}>
                  <FormButton icon="pencil" tone="secondary" onPress={() => openEditFlat(idx)} style={styles.miniBtn} />
                  <FormButton icon="trash-can" tone="danger" onPress={() => removeFlat(idx)} style={styles.miniBtn} />
                </View>
              </Surface>
            ))}
          </View>
        )}
      </View>

      {showFlatForm && (
        <Surface level={2} style={styles.editor}>
          <SectionHeader title={editingFlatIndex === null ? 'New Assignment' : 'Edit Assignment'} />
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <FormField label="Block">
                <FormPicker value={flatDraft.block} onValueChange={(v) => { setDraft('block', v); lookupTenant(v, flatDraft.flat); }} items={BLOCKS.map(b => ({ label: b, value: b }))} />
              </FormField>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FormField label="Flat">
                <FormPicker value={flatDraft.flat} onValueChange={(v) => { setDraft('flat', v); lookupTenant(flatDraft.block, v); }} items={FLATS.map(f => ({ label: f, value: f }))} />
              </FormField>
            </View>
          </View>
          <FormField label="Current Occupancy">
            <FormPicker value={flatDraft.occupied_by} onValueChange={(v) => setDraft('occupied_by', v)} items={OCCUPANCY} />
          </FormField>
          {flatDraft.occupied_by === 'TENANT' && (
            <FormField label="Resident Reference">
              <Surface level={1} style={styles.readOnly}>
                <Badge label={flatDraft.tenant_name || 'No tenant in records'} tone="neutral" />
              </Surface>
            </FormField>
          )}
          <View style={styles.editorActions}>
            <FormButton title="Confirm" onPress={saveFlat} />
            <FormButton title="Discard" onPress={() => setShowFlatForm(false)} tone="outlined" />
          </View>
        </Surface>
      )}

      <View style={styles.actions}>
        <FormButton title="Register Owner" onPress={submit} loading={saving} />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: radius.xl },
  section: { marginTop: 32 },
  flatList: { gap: 12 },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.lg,
    justifyContent: 'space-between'
  },
  flatInfo: { gap: 8 },
  occupancyRow: { flexDirection: 'row', gap: 6 },
  flatActions: { flexDirection: 'row', gap: 8 },
  miniBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  editor: { padding: 24, marginTop: 16, borderRadius: radius.xxl },
  formRow: { flexDirection: 'row' },
  readOnly: { padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  editorActions: { gap: 12, marginTop: 16 },
  actions: { marginTop: 40 },
});
