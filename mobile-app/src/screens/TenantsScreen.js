import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

export default function TenantsScreen() {
  const { user } = useAuth();
  const { colors, radius } = useAppTheme();
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
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [filters.contact, filters.tenant, sortRows, user?.mobile]);

  const loadAdminScoped = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(query);
      setRows(sortRows(res.data || []));
    } finally {
      setLoading(false);
    }
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
    <Page
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>{ownerScoped ? 'My Flat Tenants' : 'Tenant Details'}</Text>
        </View>
        {canManage ? (
          <TouchableOpacity
            style={[styles.addBtnTop, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddTenant')}
          >
            <Text style={styles.addBtnTopTxt}>Add Tenant</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Surface style={styles.filterCard}>
        {!ownerScoped ? (
          <>
            <Text style={[styles.label, { color: colors.muted }]}>Block</Text>
            <View style={[styles.pickWrap, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
              <Picker selectedValue={filters.block} onValueChange={(v) => setFilters((p) => ({ ...p, block: v }))}>
                {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
              </Picker>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
              placeholder="Flat number"
              placeholderTextColor={colors.muted}
              value={filters.flat}
              onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))}
            />
          </>
        ) : null}

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
          placeholder="Tenant name"
          placeholderTextColor={colors.muted}
          value={filters.tenant}
          onChangeText={(v) => setFilters((p) => ({ ...p, tenant: v }))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
          placeholder="Tenant contact"
          placeholderTextColor={colors.muted}
          value={filters.contact}
          onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))}
        />
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={load}>
          <Text style={styles.btnTxt}>Search</Text>
        </TouchableOpacity>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Results" subtitle={`${rows.length} record(s) found`} />
        {rows.length === 0 ? (
          <EmptyState icon="account-search-outline" title="No tenants found" subtitle="Try adjusting your filters." />
        ) : (
          rows.map((item) => (
            <Pressable
              key={item.key || String(item.property_id)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors.surface, borderColor: colors.border },
                String(item.property_id) === String(priorityPropertyId || '') && { borderColor: colors.primaryBlue, borderLeftWidth: 4, borderLeftColor: colors.primaryBlue },
                { opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => openTenant(item)}
            >
              <View style={styles.rowMain}>
                {!ownerScoped ? <Text style={[styles.rowTitle, { color: colors.text }]}>{item.block} | {item.flat}</Text> : null}
                <Text style={[styles.rowTenant, { color: colors.text }]}>{item.tenant_name || 'Not Available'}</Text>
                <Text style={[styles.rowMeta, { color: colors.muted }]}>{item.tenant_contact || 'NA'}</Text>
              </View>
              {ownerScoped ? <Badge label={item.status_label} tone={item.is_active ? 'success' : 'neutral'} /> : <MaterialCommunityIcons name="chevron-right" size={20} color={colors.borderStrong} />}
            </Pressable>
          ))
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnTop: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnTopTxt: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800' },
  filterCard: { padding: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  pickWrap: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10, fontSize: 15, fontWeight: '600' },
  btn: { borderRadius: 12, padding: 14, marginBottom: 0 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '800', fontSize: 15 },
  section: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  rowMain: { flex: 1 },
  rowTitle: { fontWeight: '800', marginBottom: 2 },
  rowTenant: { fontWeight: '800', fontSize: 16 },
  rowMeta: { marginTop: 4, fontWeight: '500' },
});
