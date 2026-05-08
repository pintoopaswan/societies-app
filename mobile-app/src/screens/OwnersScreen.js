import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

export default function OwnersScreen() {
  const navigation = useNavigation();
  const [filters, setFilters] = useState({ block: 'ALL', flat: '', owner: '', contact: '' });
  const [rows, setRows] = useState([]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if ((v || '').trim()) p.append(k, v); });
    return `/api/owners?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    const res = await apiRequest(query);
    setRows(res.data || []);
  }, [query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page>
      <Text style={styles.title}>Owner Details</Text>
      <Text style={styles.label}>Block</Text>
      <View style={styles.pickWrap}><Picker selectedValue={filters.block} onValueChange={(v) => setFilters((p) => ({ ...p, block: v }))}>{BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}</Picker></View>
      <TextInput style={styles.input} placeholder="Flat number" value={filters.flat} onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))} />
      <TextInput style={styles.input} placeholder="Owner name" value={filters.owner} onChangeText={(v) => setFilters((p) => ({ ...p, owner: v }))} />
      <TextInput style={styles.input} placeholder="Owner contact" value={filters.contact} onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))} />
      <TouchableOpacity style={styles.btn} onPress={load}><Text style={styles.btnTxt}>Search</Text></TouchableOpacity>
      {(rows || []).map((item) => (
        <TouchableOpacity key={String(item.property_id)} style={styles.row} onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id })}>
          <Text style={styles.rowTitle}>{item.block} | {item.flat}</Text>
          <Text style={styles.rowMeta}>{item.owner_name || 'NA'} | {item.owner_contact || 'NA'}</Text>
          <Text style={styles.rowMeta}>Occupied: {item.is_occupied ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  label: { color: '#5c738c', fontWeight: '700' },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  btn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginBottom: 8 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#4f81c8' },
  rowTitle: { color: '#153d63', fontWeight: '800' },
  rowMeta: { color: '#647d93', marginTop: 2 },
});
