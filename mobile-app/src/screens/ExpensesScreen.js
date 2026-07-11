import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  ActivityRow,
  EmptyState,
  StatCard,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

const ExpenseCard = React.memo(({ item, onPress, isLast }) => (
  <ActivityRow
    title={item.item_name}
    subtitle={`${item.paid_by || 'Society'} · ${fmtAmount(item.amount)}`}
    time={item.transaction_date}
    icon="cash-minus"
    tone="danger"
    isLast={isLast}
    onPress={onPress}
  />
));

export default function ExpensesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { colors } = useAppTheme();
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader
          title="Expense Ledger"
          actionLabel={isAdmin ? "Record" : undefined}
          onAction={() => navigation.navigate('NewExpense')}
        />

        <Surface level={1} style={styles.filterCard}>
          <View style={styles.tabRow}>
            {['all', 'month'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.tab,
                  { backgroundColor: colors.surfaceContainerHighest },
                  filters.scope === s && { backgroundColor: colors.primary }
                ]}
                onPress={() => setFilters(p => ({ ...p, scope: s }))}
              >
                <Text style={[
                  styles.tabText,
                  { color: colors.onSurfaceVariant },
                  filters.scope === s && { color: colors.onPrimary }
                ]}>
                  {s === 'all' ? 'All Time' : 'This Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Surface level={2} style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              placeholder="Search expenses..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={filters.item}
              onChangeText={(v) => setFilters(p => ({ ...p, item: v }))}
            />
          </Surface>
        </Surface>

        <View style={styles.summaryRow}>
          <StatCard
            label="Total Spend"
            value={fmtAmount(summary?.total_expense || 0)}
            icon="cash-minus"
            tone="secondary"
          />
          <StatCard
            label="Net Balance"
            value={fmtAmount(summary?.balance || 0)}
            icon="bank"
            tone="primary"
          />
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item, index }) => (
          <Surface level={1} style={index === 0 ? styles.firstItem : (index === (data.length - 1) ? styles.lastItem : styles.midItem)}>
            <ExpenseCard
              item={item}
              isLast={index === (data.length - 1)}
              onPress={() => navigation.navigate('EditExpense', { expense: item, onSaved: load })}
            />
          </Surface>
        )}
        ListEmptyComponent={
          !refreshing && (
            <EmptyState
              icon="receipt-text-outline"
              title="No expenses found"
              subtitle="Community spending records will appear here."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterCard: {
    padding: 12,
    gap: 12,
    marginBottom: 16,
    borderRadius: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    ...typography.bodyMedium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listContent: {
    padding: 16,
  },
  firstItem: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 0,
    paddingHorizontal: 16,
  },
  midItem: {
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 16,
  },
  lastItem: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 0,
    paddingHorizontal: 16,
  },
});
