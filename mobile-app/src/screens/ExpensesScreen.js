import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function ExpensesScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total_collection: 0, total_expense: 0, balance: 0 });
  const [item, setItem] = useState('');
  const navigation = useNavigation();

  const query = useMemo(() => `/api/expenses?item=${encodeURIComponent(item)}`, [item]);

  const load = useCallback(async () => {
    const res = await apiRequest(query);
    setRows(res.data || []);
    setSummary(res.summary || { total_collection: 0, total_expense: 0, balance: 0 });
  }, [query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#153d63" />
          </TouchableOpacity>
          <Text style={styles.title}>Expenses</Text>
        </View>
        {canManage ? (
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewExpense', { onSaved: load })}>
            <View style={styles.inlineIcon}><MaterialCommunityIcons name="plus-circle-outline" size={16} color="#fff" /><Text style={styles.addButtonText}>Add Expense</Text></View>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tilesRow}>
        <StatTile label="Collection" value={summary.total_collection} color="#1f6fb2" />
        <StatTile label="Expense" value={summary.total_expense} color="#dc2626" />
        <StatTile label="Balance" value={summary.balance} color="#16a34a" />
      </View>

      <TextInput style={styles.search} placeholder="Search by item name" value={item} onChangeText={setItem} />
      <TouchableOpacity style={styles.applyBtn} onPress={load}><Text style={styles.applyBtnText}>Search</Text></TouchableOpacity>

      {rows.map((exp) => (
        <TouchableOpacity key={String(exp.id)} style={styles.row} onPress={() => navigation.navigate('EditExpense', { expense: exp, onSaved: load })}>
          <Text style={styles.rowTitle}>{exp.transaction_date} | {exp.item_name}</Text>
          <Text style={styles.rowMeta}>Rs {Math.round(exp.amount)}</Text>
        </TouchableOpacity>
      ))}
    </Page>
  );
}

function StatTile({ label, value, color }) {
  return (
    <View style={[styles.tile, { borderLeftColor: color }]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>Rs {Math.round(value || 0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { backgroundColor: '#eaf2fb', borderRadius: 8, padding: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#153d63' },
  addButton: { backgroundColor: '#1f6fb2', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addButtonText: { color: '#fff', fontWeight: '700' },
  tilesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderLeftWidth: 4 },
  tileLabel: { color: '#667f96', fontWeight: '700', fontSize: 12 },
  tileValue: { color: '#163f66', fontWeight: '800', marginTop: 2 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1ddeb', borderRadius: 10, padding: 10 },
  applyBtn: { backgroundColor: '#123f69', borderRadius: 10, padding: 10, marginTop: 8, marginBottom: 8 },
  applyBtnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  rowTitle: { color: '#153d63', fontWeight: '700' },
  rowMeta: { color: '#647d93', marginTop: 4 },
});
