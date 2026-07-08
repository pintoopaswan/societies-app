import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function ExpensesScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { colors, radius } = useAppTheme();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [filters, setFilters] = useState({ item: '', scope: 'all' });
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.item) p.append('item', filters.item);
    p.append('scope', filters.scope);
    return `/api/expenses?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest(query, {}, token);
      setData(res.data || []);
      setSummary(res.summary || null);
    } catch {
      setData([]);
      setSummary(null);
    } finally {
      setRefreshing(false);
    }
  }, [query, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('NewExpense')}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <Surface style={styles.filterCard}>
        <Text style={[styles.filterLabel, { color: colors.muted }]}>Search Expenses</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
          placeholder="Item name or category..."
          placeholderTextColor={colors.muted}
          value={filters.item}
          onChangeText={(v) => setFilters(p => ({ ...p, item: v }))}
        />
        <View style={styles.tabRow}>
          {['all', 'month'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.tab, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }, filters.scope === s && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilters(p => ({ ...p, scope: s }))}
            >
              <Text style={[styles.tabText, { color: colors.text }, filters.scope === s && { color: '#fff' }]}>
                {s === 'all' ? 'All Time' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Surface>

      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{fmtAmount(summary?.total_expense || 0)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Spend</Text>
        </Surface>
        <Surface style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: (summary?.balance || 0) >= 0 ? colors.success : colors.danger }]}>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{fmtAmount(summary?.balance || 0)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Balance</Text>
        </Surface>
      </View>

      <View style={styles.results}>
        <SectionHeader title="Transactions" subtitle={filters.scope === 'all' ? 'Historical' : 'Current month'} />
        {data.length === 0 ? (
          <EmptyState
            icon="receipt-text-outline"
            title="No expenses found"
            subtitle="Try a different search or change the scope."
          />
        ) : (
          <Surface style={{ padding: 0 }}>
            {data.map((item, idx) => (
              <ActivityRow
                key={item.id}
                title={item.item_name}
                subtitle={`${item.paid_by || 'Society'} · ${fmtAmount(item.amount)}`}
                time={item.transaction_date}
                icon="cash-minus"
                tone="complaint"
                isLast={idx === data.length - 1}
                onPress={() => navigation.navigate('EditExpense', { expense: item, onSaved: load })}
              />
            ))}
          </Surface>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 2 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  filterCard: { padding: 16, gap: 12, marginBottom: 16 },
  filterLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 14, gap: 2 },
  summaryVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  results: { marginTop: 4 },
});
