import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography, radius } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  ActivityRow,
  EmptyState,
  StatCard,
  FormPicker,
} from '../components/DesignSystem';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

const PaymentCard = React.memo(({ item, onPress, isLast }) => (
  <ActivityRow
    title={`${item.block} · Unit ${item.flat}`}
    subtitle={`${item.mode_of_payment || 'Payment'} · ${fmtAmount(item.amount)}`}
    time={item.payment_date}
    icon="check-decagram"
    tone="success"
    isLast={isLast}
    onPress={onPress}
  />
));

export default function PaymentsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { colors, dark } = useAppTheme();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const now = new Date();
  const [filters, setFilters] = useState({
    scope: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    block: 'ALL',
    flat: '',
  });

  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.append(k, String(v)); });
    return `/api/payments?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest(query, {}, token);
      setData(res.data || null);
    } catch {
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, [query, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader
          title="Receipts"
          actionLabel={isAdmin ? "Add Entry" : undefined}
          onAction={() => navigation.navigate('NewPayment')}
        />

        <Surface level={1} style={styles.filterCard}>
          <View style={styles.filterRow}>
            <View style={{ flex: 1.2 }}>
              <FormPicker
                value={filters.month}
                onValueChange={(v) => setFilters(p => ({ ...p, month: v }))}
                items={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormPicker
                value={filters.block}
                onValueChange={(v) => setFilters(p => ({ ...p, block: v }))}
                items={BLOCKS.map(b => ({ label: b, value: b }))}
              />
            </View>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceContainerHighest }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.onSurface }]}
              placeholder="Search by unit number..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={filters.flat}
              onChangeText={(v) => setFilters(p => ({ ...p, flat: v }))}
            />
          </View>
        </Surface>

        <View style={styles.summaryRow}>
          <StatCard
            label="Total Amount"
            value={fmtAmount(data?.total_amount || 0)}
            icon="cash-multiple"
            tone="primary"
          />
          <StatCard
            label="Total Count"
            value={data?.count || 0}
            icon="receipt"
            tone="secondary"
          />
        </View>
      </View>

      <FlatList
        data={data?.entries || []}
        keyExtractor={(item) => String(item.payment_id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item, index }) => (
          <Surface level={1} style={[
            styles.listItem,
            index === 0 && styles.firstItem,
            index === (data?.entries.length - 1) && styles.lastItem,
            { borderBottomWidth: index === (data?.entries.length - 1) ? 0 : 1, borderBottomColor: colors.outlineVariant }
          ]}>
            <PaymentCard
              item={item}
              isLast={true}
              onPress={() => navigation.navigate('EditPayment', { payment: item, onSaved: load })}
            />
          </Surface>
        )}
        ListEmptyComponent={
          !refreshing && (
            <EmptyState
              icon="receipt-text-outline"
              title="No Records"
              subtitle={`No payments found for ${MONTHS[filters.month-1]} ${filters.year}`}
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
    paddingBottom: 20,
  },
  filterCard: {
    padding: 16,
    gap: 12,
    marginBottom: 20,
    borderRadius: radius.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    ...typography.bodyMedium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    padding: 0,
    paddingHorizontal: 20,
    borderRadius: 0,
  },
  firstItem: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  lastItem: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
});
