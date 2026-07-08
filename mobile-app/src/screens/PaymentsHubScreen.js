import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  ActivityRow,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function timeAgo(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return String(value);
  }
}

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── ReceiptRow ───────────────────────────────────────────────────────────────

function ReceiptRow({ item, onPress, isLast }) {
  return (
    <ActivityRow
      title={`${item.block} · ${item.flat}`}
      subtitle={`${item.mode || 'Payment'} · ${fmtAmount(item.amount)}`}
      time={timeAgo(item.date)}
      icon="cash-check"
      tone="payment"
      onPress={onPress}
      isLast={isLast}
    />
  );
}

// ─── BlockRow ─────────────────────────────────────────────────────────────────

function BlockRow({ item, isLast }) {
  const { colors, radius } = useAppTheme();
  const pct = item.total_flats
    ? Math.max(0, Math.min(100, (item.paid_flats / item.total_flats) * 100))
    : 0;

  const barColor =
    pct >= 75 ? colors.success :
    pct >= 40 ? colors.warning : colors.danger;

  const badgeTone =
    pct >= 75 ? 'success' :
    pct >= 40 ? 'warning' : 'danger';

  const fillPct = Math.round(pct);

  return (
    <View style={[styles.blockRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.blockIconWrap, { backgroundColor: colors.surfaceSoft }]}>
        <MaterialCommunityIcons name="home-city-outline" size={15} color={colors.muted} />
      </View>

      <View style={styles.blockContent}>
        <View style={styles.blockTopRow}>
          <Text style={[styles.blockTitle, { color: colors.text }]}>Block {item.block}</Text>
          <Badge label={`${fillPct}%`} tone={badgeTone} />
        </View>

        <Text style={[styles.blockMeta, { color: colors.muted }]}>{item.paid_flats} of {item.total_flats} flats paid</Text>

        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: barColor,
                flex: fillPct || 0.001,
              },
            ]}
          />
          {fillPct < 100 && (
            <View style={{ flex: 100 - fillPct, backgroundColor: 'transparent' }} />
          )}
        </View>

        <Text style={[styles.blockFoot, { color: colors.muted }]}>
          {item.pending_flats} pending
          {item.completion_pct ? ` · ${Math.round(item.completion_pct)}% this cycle` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaymentsHubScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  const actionCards = useMemo(() => {
    const base = [
      {
        title: 'Payment Ledger',
        subtitle: 'Browse & filter receipts',
        icon: 'file-table-outline',
        tone: 'default',
        onPress: () => navigation.navigate('PaymentsList'),
      },
      {
        title: 'Payment Info',
        subtitle: 'UPI & QR details',
        icon: 'qrcode',
        tone: 'accent',
        onPress: () => navigation.navigate('PaymentInfo'),
      },
      {
        title: 'Expenses',
        subtitle: 'Expense & balance view',
        icon: 'cash-minus',
        tone: 'warning',
        onPress: () => navigation.navigate('ExpensesList'),
      },
      {
        title: 'Support',
        subtitle: 'Complaints & helpdesk',
        icon: 'lifebuoy',
        tone: 'danger',
        onPress: () => navigation.navigate('Helpdesk'),
      },
    ];

    if (canManage) {
      return [
        {
          title: 'Add Payment',
          subtitle: 'Create a new receipt',
          icon: 'cash-plus',
          tone: 'success',
          onPress: () => navigation.navigate('NewPayment'),
        },
        {
          title: 'Add Expense',
          subtitle: 'Log a society expense',
          icon: 'slate',
          tone: 'slate',
          onPress: () => navigation.navigate('NewExpense'),
        },
        ...base,
      ];
    }
    return base;
  }, [canManage, navigation]);

  const recentPayments = (data?.recent_payments  || []).slice(0, 5);
  const pendingBlocks  = (data?.top_pending_blocks || []).slice(0, 5);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.appBg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={load}
          tintColor={colors.primaryBlue}
          colors={[colors.primaryBlue]}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerEyebrow, { color: colors.primaryBlue }]}>Payments</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Hub</Text>
        </View>
        <View style={styles.headerRight}>
          <Badge label="Live" tone="success" />
          <Pressable
            onPress={() => navigation.navigate('PaymentsList')}
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.primaryBlue} />
          </Pressable>
        </View>
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <Surface style={styles.statsStrip}>
        <StatCell
          label="TODAY"
          value={data?.today || '—'}
        />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatCell
          label="PERIOD"
          value={`${data?.month_name || 'Month'} ${data?.year || ''}`}
        />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatCell
          label="PENDING"
          value={pendingBlocks.length > 0 ? `${pendingBlocks.length} blocks` : 'All clear'}
        />
      </Surface>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.tileList}>
          {actionCards.map((card) => (
            <QuickAction key={card.title} {...card} />
          ))}
        </View>
      </View>

      {/* ── Recent Receipts ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Receipts"
          actionLabel="All receipts"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {recentPayments.length > 0 ? (
          <Surface style={{ padding: 0 }}>
            {recentPayments.map((item, idx) => (
              <ReceiptRow
                key={`${item.block}-${item.flat}-${item.date}-${idx}`}
                item={item}
                isLast={idx === recentPayments.length - 1}
                onPress={() => navigation.navigate('PaymentsList')}
              />
            ))}
          </Surface>
        ) : (
          <EmptyState
            icon="progress-clock"
            title="Fetching receipts"
            subtitle="Loading the latest payment activity."
          />
        )}
      </View>

      {/* ── Follow-up Blocks ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Follow-up Blocks"
          actionLabel="Open ledger"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {pendingBlocks.length > 0 ? (
          <Surface style={{ padding: 0 }}>
            {pendingBlocks.map((item, idx) => (
              <BlockRow
                key={item.block}
                item={item}
                isLast={idx === pendingBlocks.length - 1}
              />
            ))}
          </Surface>
        ) : (
          <EmptyState
            icon="check-circle-outline"
            title="All blocks caught up"
            subtitle="No follow-ups needed for this cycle."
          />
        )}
      </View>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 18,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Stats strip ─────────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statsDivider: {
    width: 1,
    height: 28,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginTop: 22,
  },

  // ── Action tiles ────────────────────────────────────────────────────────────
  tileList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // ── Block row ───────────────────────────────────────────────────────────────
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  blockIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  blockContent: {
    flex: 1,
    minWidth: 0,
  },
  blockTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    gap: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  blockMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Progress bar — uses flexDirection row + flex ratio (RN-safe, no % widths)
  progressTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 7,
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },

  blockFoot: {
    fontSize: 11,
    fontWeight: '500',
  },
});
