import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

export default function TenantsScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const [filters, setFilters] = useState({ block: 'ALL', flat: '', tenant: '', contact: '' });
  const [rows, setRows] = useState([]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if ((v || '').trim()) p.append(k, v); });
    return `/api/tenants?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    const res = await apiRequest(query);
    setRows(res.data || []);
  }, [query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page>
      <View style={styles.headerRow}><Text style={styles.title}>Tenant Details</Text>{canManage ? <TouchableOpacity style={styles.addBtnTop} onPress={() => navigation.navigate('AddTenant')}><Text style={styles.addBtnTopTxt}>Add Tenant</Text></TouchableOpacity> : null}</View>
      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}><Picker selectedValue={filters.block} onValueChange={(v) => setFilters((p) => ({ ...p, block: v }))}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
      <TextInput style={styles.input} placeholder="Flat number" value={filters.flat} onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))} />
      <TextInput style={styles.input} placeholder="Tenant name" value={filters.tenant} onChangeText={(v) => setFilters((p) => ({ ...p, tenant: v }))} />
      <TextInput style={styles.input} placeholder="Tenant contact" value={filters.contact} onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))} />
      <TouchableOpacity style={styles.btn} onPress={load}><Text style={styles.btnTxt}>Search</Text></TouchableOpacity>
      {(rows || []).map((item) => (
        <TouchableOpacity key={String(item.property_id)} style={styles.row} onPress={() => navigation.navigate('TenantDetails', { propertyId: item.property_id })}>
          <Text style={styles.rowTitle}>{item.block} | {item.flat}</Text>
          <Text style={styles.rowMeta}>{item.tenant_name || 'NA'} | {item.tenant_contact || 'NA'}</Text>
        </TouchableOpacity>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addBtnTop: { backgroundColor: '#1f6fb2', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  addBtnTopTxt: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#153d63' },
  label: { color: '#5c738c', fontWeight: '700' },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginBottom: 8 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#58ad77' },
  rowTitle: { color: '#153d63', fontWeight: '800' },
  rowMeta: { color: '#647d93', marginTop: 2 },
});
