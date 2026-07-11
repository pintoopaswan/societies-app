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
import { useAppTheme, typography, radius } from '../lib/theme';
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
  const { colors, dark } = useAppTheme();
  const pct = item.total_flats ? (item.paid_flats / item.total_flats) * 100 : 0;

  return (
    <Surface level={1} style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <Text style={[styles.blockTitle, { color: colors.onSurface }]}>Block {item.block}</Text>
        <Badge label={`${item.paid_flats}/${item.total_flats} Paid`} tone={pct > 80 ? 'success' : (pct > 50 ? 'info' : 'warning')} />
      </View>
      <ProgressBar value={pct} color={pct > 80 ? colors.success : colors.primary} />
      <Text style={[styles.blockMeta, { color: colors.onSurfaceVariant }]}>
        {item.pending_flats} units pending this month
      </Text>
    </Surface>
  );
};

export default function PaymentsHubScreen() {
  const { user, token } = useAuth();
  const { colors, dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/dashboard', {}, token);
      setData(res.data || null);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Today Inflow', value: fmtAmount(data.today_amount || 0), icon: 'cash-clock', tone: 'primary' },
      { label: 'Billing Period', value: data.month_name || 'Current', icon: 'calendar-month-outline', tone: 'secondary' },
    ];
  }, [data]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <Surface level={1} style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryContainer }]}>
          <MaterialCommunityIcons name="shield-finance" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Financial Hub</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Enterprise-grade tracking of community funds, collections, and expenses.
        </Text>
      </Surface>

      <View style={styles.statsRow}>
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Treasury Tools" />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Receipts"
            subtitle="View history"
            icon="file-document-check-outline"
            onPress={() => navigation.navigate('PaymentsList')}
          />
          <QuickAction
            title="Expenses"
            subtitle="Spends log"
            icon="cash-minus"
            tone="secondary"
            onPress={() => navigation.navigate('ExpensesList')}
          />
          {canManage && (
            <>
              <QuickAction
                title="Add Receipt"
                subtitle="Record income"
                icon="plus-circle"
                onPress={() => navigation.navigate('NewPayment')}
              />
              <QuickAction
                title="Log Expense"
                subtitle="Record spend"
                icon="minus-circle"
                tone="secondary"
                onPress={() => navigation.navigate('NewExpense')}
              />
            </>
          )}
        </View>
      </View>

      {canManage && data?.top_pending_blocks?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Collection Pulse" subtitle="Real-time completion by block." />
          <View style={styles.blockList}>
            {data.top_pending_blocks.map((item, idx) => (
              <BlockCard key={idx} item={item} />
            ))}
          </View>
        </View>
      )}

      {data?.recent_payments?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recent Inflow" actionLabel="See All" onAction={() => navigation.navigate('PaymentsList')} />
          <Surface level={1} style={{ padding: 0, overflow: 'hidden' }}>
            {data.recent_payments.slice(0, 5).map((item, idx) => (
              <ActivityRow
                key={idx}
                title={`${item.block} · Unit ${item.flat}`}
                subtitle={`${item.mode || 'Payment'} · ${fmtAmount(item.amount)}`}
                time={item.date}
                icon="check-circle-outline"
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
  hero: { padding: 24, borderRadius: radius.xxl, marginBottom: 12 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroTitle: { ...typography.headlineSmall, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { ...typography.bodyLarge, lineHeight: 24, opacity: 0.8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  section: { marginTop: 32 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  blockList: { gap: 16 },
  blockCard: { padding: 20, borderRadius: radius.xl, gap: 16 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { ...typography.titleMedium, fontWeight: '800' },
  blockMeta: { ...typography.bodySmall, opacity: 0.7 },
});
