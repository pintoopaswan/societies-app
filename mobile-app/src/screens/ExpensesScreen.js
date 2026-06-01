import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, ui } from '../lib/theme';

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
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.primary} />
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
        <StatTile label="Collection" value={summary.total_collection} color="#20343a" />
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
  backBtn: { backgroundColor: colors.surface, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: colors.border },
  title: { ...ui.title, marginBottom: 0 },
  addButton: ui.primaryButton,
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addButtonText: ui.primaryButtonText,
  tilesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tile: { flex: 1, ...ui.card, padding: 10, borderLeftWidth: 0 },
  tileLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  tileValue: { color: colors.text, fontWeight: '800', marginTop: 2 },
  search: ui.input,
  applyBtn: { ...ui.primaryButton, marginTop: 8, marginBottom: 8 },
  applyBtnText: { ...ui.primaryButtonText, textAlign: 'center' },
  row: ui.row,
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.muted, marginTop: 4 },
});
