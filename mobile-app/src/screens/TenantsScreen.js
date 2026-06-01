import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

export default function TenantsScreen() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const canManage = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const navigation = useNavigation();
  const route = useRoute();
  const ownerScoped = isOwner || !!route.params?.ownerScoped;
  const priorityPropertyId = route.params?.priorityPropertyId;
  const [filters, setFilters] = useState({
    block: 'ALL',
    flat: '',
    tenant: '',
    contact: '',
  });
  const [rows, setRows] = useState([]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if ((v || '').trim()) p.append(k, v); });
    return `/api/tenants?${p.toString()}`;
  }, [filters]);

  const sortRows = useCallback((data) => {
    if (!priorityPropertyId) return data;
    const targetId = String(priorityPropertyId);
    return [
      ...data.filter((item) => String(item.property_id) === targetId),
      ...data.filter((item) => String(item.property_id) !== targetId),
    ];
  }, [priorityPropertyId]);

  const loadOwnerScoped = useCallback(async () => {
    if (!user?.mobile) return setRows([]);
    const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
    const ownerFlats = res.data || [];
    const expanded = ownerFlats.flatMap((flat) => {
      const active = flat.tenant_name ? [{
        key: `active-${flat.property_id}`,
        property_id: flat.property_id,
        block: flat.block,
        flat: flat.flat,
        owner_name: flat.owner_name || '',
        owner_contact: flat.owner_contact || '',
        tenant_name: flat.tenant_name || '',
        tenant_contact: flat.tenant_contact || '',
        tenant_living_from: flat.tenant_living_from || '',
        tenant_vehicle_list: flat.tenant_vehicle_list || '',
        tenant_photo_url: flat.tenant_photo_url || '',
        tenant_guard_payment_details: flat.tenant_guard_payment_details || '',
        payment_history: flat.payment_history || [],
        status_label: 'Active',
        is_active: true,
      }] : [];
      const history = (flat.past_tenants || []).map((tenant, idx) => ({
        key: `history-${flat.property_id}-${idx}`,
        property_id: flat.property_id,
        block: flat.block,
        flat: flat.flat,
        owner_name: flat.owner_name || '',
        owner_contact: flat.owner_contact || '',
        tenant_name: tenant.tenant_name || '',
        tenant_contact: tenant.tenant_contact || '',
        tenant_living_from: tenant.tenant_living_from || '',
        tenant_vehicle_list: tenant.tenant_vehicle_list || '',
        tenant_photo_url: tenant.tenant_photo_url || '',
        tenant_guard_payment_details: tenant.tenant_guard_payment_details || '',
        payment_history: flat.payment_history || [],
        status_label: 'Inactive',
        is_active: false,
      }));
      return [...active, ...history];
    });
    const filtered = expanded.filter((item) => {
      const matchesTenant = !filters.tenant.trim() || (item.tenant_name || '').toLowerCase().includes(filters.tenant.trim().toLowerCase());
      const matchesContact = !filters.contact.trim() || (item.tenant_contact || '').includes(filters.contact.trim());
      return matchesTenant && matchesContact;
    });
    setRows(sortRows(filtered));
  }, [filters.contact, filters.tenant, sortRows, user?.mobile]);

  const loadAdminScoped = useCallback(async () => {
    const res = await apiRequest(query);
    setRows(sortRows(res.data || []));
  }, [query, sortRows]);

  const load = useCallback(async () => {
    if (ownerScoped) return loadOwnerScoped();
    return loadAdminScoped();
  }, [loadAdminScoped, loadOwnerScoped, ownerScoped]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openTenant = (item) => {
    if (ownerScoped) {
      navigation.navigate('TenantDetails', {
        propertyId: item.property_id,
        readOnly: true,
        snapshot: item,
      });
      return;
    }
    navigation.navigate('TenantDetails', { propertyId: item.property_id, readOnly: false });
  };

  return (
    <Page>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {ownerScoped ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#172b31" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>{ownerScoped ? 'My Flat Tenants' : 'Tenant Details'}</Text>
        </View>
        {canManage ? <TouchableOpacity style={styles.addBtnTop} onPress={() => navigation.navigate('AddTenant')}><Text style={styles.addBtnTopTxt}>Add Tenant</Text></TouchableOpacity> : null}
      </View>

      {!ownerScoped ? (
        <>
          <Text style={styles.label}>Block</Text>
          <View style={styles.pickWrap}><Picker selectedValue={filters.block} onValueChange={(v) => setFilters((p) => ({ ...p, block: v }))}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
          <TextInput style={styles.input} placeholder="Flat number" value={filters.flat} onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))} />
        </>
      ) : null}

      <TextInput style={styles.input} placeholder="Tenant name" value={filters.tenant} onChangeText={(v) => setFilters((p) => ({ ...p, tenant: v }))} />
      <TextInput style={styles.input} placeholder="Tenant contact" value={filters.contact} onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))} />
      <TouchableOpacity style={styles.btn} onPress={load}><Text style={styles.btnTxt}>Search</Text></TouchableOpacity>

      {(rows || []).map((item) => (
        <TouchableOpacity key={item.key || String(item.property_id)} style={[styles.row, String(item.property_id) === String(priorityPropertyId || '') && styles.priorityRow]} onPress={() => openTenant(item)}>
          {!ownerScoped ? <Text style={styles.rowTitle}>{item.block} | {item.flat}</Text> : null}
          <Text style={styles.rowTenant}>{item.tenant_name || 'Not Available'}</Text>
          <Text style={styles.rowMeta}>{item.tenant_contact || 'NA'}</Text>
          {ownerScoped ? <Text style={[styles.statusPill, item.is_active ? styles.statusActive : styles.statusInactive]}>{item.status_label}</Text> : null}
        </TouchableOpacity>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { backgroundColor: '#fff', borderRadius: 8, padding: 8 },
  addBtnTop: { backgroundColor: '#20343a', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  addBtnTopTxt: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#172b31' },
  label: { color: '#5c738c', fontWeight: '700' },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  btn: { backgroundColor: '#20343a', borderRadius: 10, padding: 10, marginBottom: 8 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#58ad77' },
  priorityRow: { borderLeftColor: '#0f766e', backgroundColor: '#f0fdfa' },
  rowTitle: { color: '#172b31', fontWeight: '800' },
  rowTenant: { color: '#172b31', fontWeight: '800' },
  rowMeta: { color: '#647d93', marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  statusActive: { backgroundColor: '#dcfce7', color: '#166534' },
  statusInactive: { backgroundColor: '#e5e7eb', color: '#374151' },
});
