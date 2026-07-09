import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  ActivityRow,
  Surface,
  Badge,
  EmptyState,
  StatCard,
  ProgressBar,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

const BlockCard = ({ item }) => {
  const { colors } = useAppTheme();
  const pct = item.total_flats ? (item.paid_flats / item.total_flats) * 100 : 0;

  return (
    <Surface level={1} style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <Text style={[styles.blockTitle, { color: colors.onSurface }]}>Block {item.block}</Text>
        <Badge label={`${item.paid_flats}/${item.total_flats} Paid`} tone={pct > 80 ? 'success' : (pct > 50 ? 'info' : 'warning')} />
      </View>
      <ProgressBar value={pct} color={pct > 80 ? colors.success : colors.primary} />
      <Text style={[styles.blockMeta, { color: colors.onSurfaceVariant }]}>
        {item.pending_flats} flats pending collection
      </Text>
    </Surface>
  );
};

export default function PaymentsHubScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/dashboard');
      setData(res.data || null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Collection Today', value: data.today || '₹0', icon: 'cash-clock', tone: 'primary' },
      { label: 'Current Period', value: data.month_name || 'Month', icon: 'calendar-range', tone: 'secondary' },
    ];
  }, [data]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <Surface level={2} style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryContainer }]}>
          <MaterialCommunityIcons name="finance" size={32} color={colors.onPrimaryContainer} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Financial Hub</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Track collections, manage expenses, and monitor society funds in real-time.
        </Text>
      </Surface>

      <View style={styles.statsRow}>
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Financial Tools" />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Payment Ledger"
            subtitle="View all receipts"
            icon="file-document-outline"
            onPress={() => navigation.navigate('PaymentsList')}
          />
          <QuickAction
            title="Expenses"
            subtitle="Society spending"
            icon="cash-minus"
            tone="secondary"
            onPress={() => navigation.navigate('ExpensesList')}
          />
          {canManage && (
            <>
              <QuickAction
                title="Record Payment"
                subtitle="New entry"
                icon="plus-circle-outline"
                onPress={() => navigation.navigate('NewPayment')}
              />
              <QuickAction
                title="Log Expense"
                subtitle="New spend"
                icon="minus-circle-outline"
                tone="secondary"
                onPress={() => navigation.navigate('NewExpense')}
              />
            </>
          )}
        </View>
      </View>

      {canManage && data?.top_pending_blocks?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Collection Status" subtitle="Pending items by block." />
          <View style={styles.blockList}>
            {data.top_pending_blocks.map((item, idx) => (
              <BlockCard key={idx} item={item} />
            ))}
          </View>
        </View>
      )}

      {data?.recent_payments?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recent Activity" actionLabel="All" onAction={() => navigation.navigate('PaymentsList')} />
          <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
            {data.recent_payments.slice(0, 5).map((item, idx) => (
              <ActivityRow
                key={idx}
                title={`${item.block} · ${item.flat}`}
                subtitle={`${item.mode || 'Payment'} · ${fmtAmount(item.amount)}`}
                time={item.date}
                icon="cash-check"
                tone="success"
                isLast={idx === 4 || idx === data.recent_payments.length - 1}
                onPress={() => navigation.navigate('PaymentsList')}
              />
            ))}
          </Surface>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16 },
  hero: { padding: 24, borderRadius: radius.xxl, marginBottom: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { ...typography.bodyLarge, lineHeight: 22 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  section: { marginTop: 24 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  blockList: { gap: 12 },
  blockCard: { padding: 16, borderRadius: radius.xl, gap: 12 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { ...typography.titleMedium, fontWeight: '700' },
  blockMeta: { ...typography.bodySmall },
});
