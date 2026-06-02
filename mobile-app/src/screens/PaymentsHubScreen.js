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

// ─── Design tokens ────────────────────────────────────────────────────────────

const P = {
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',
  surfacePress: '#F8F9FF',

  ink:          '#0D0F14',
  inkSub:       '#5A6375',
  inkMuted:     '#9BA3B4',

  brand:        '#1A56DB',
  brandSoft:    '#EEF4FF',
  brandMid:     '#C7D8FF',

  emerald:      '#0B8A5E',
  emeraldSoft:  '#ECFDF5',
  emeraldMid:   '#A7F3D0',

  amber:        '#C07A10',
  amberSoft:    '#FFFBEB',
  amberMid:     '#FDE68A',

  rose:         '#C81E45',
  roseSoft:     '#FFF1F2',
  roseMid:      '#FECDD3',

  violet:       '#6D28D9',
  violetSoft:   '#F5F3FF',
  violetMid:    '#DDD6FE',

  slate:        '#475569',
  slateSoft:    '#F1F5F9',

  border:       '#E8EAF0',
  borderSubtle: '#F1F3F8',
};

const TONE = {
  primary: { bg: P.brandSoft,   fg: P.brand,   ring: P.brandMid   },
  accent:  { bg: P.violetSoft,  fg: P.violet,  ring: P.violetMid  },
  success: { bg: P.emeraldSoft, fg: P.emerald, ring: P.emeraldMid },
  warning: { bg: P.amberSoft,   fg: P.amber,   ring: P.amberMid   },
  danger:  { bg: P.roseSoft,    fg: P.rose,    ring: P.roseMid    },
  neutral: { bg: P.slateSoft,   fg: P.slate,   ring: '#CBD5E1'    },
};

const SHADOW_SM = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
  android: { elevation: 1 },
  default: {},
});

const SHADOW_MD = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
  android: { elevation: 2 },
  default: {},
});

// ─── LiveBadge ────────────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveBadgeText}>Live</Text>
    </View>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={P.brand} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── ActionTile ───────────────────────────────────────────────────────────────

function ActionTile({ title, subtitle, icon, tone = 'primary', onPress }) {
  const t = TONE[tone] || TONE.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        pressed && styles.actionTilePressed,
      ]}
    >
      {/* Left accent strip */}
      <View style={[styles.tileStrip, { backgroundColor: t.fg }]} />

      {/* Icon pill */}
      <View style={[styles.tileIcon, { backgroundColor: t.bg, borderColor: t.ring }]}>
        <MaterialCommunityIcons name={icon} size={20} color={t.fg} />
      </View>

      {/* Labels */}
      <View style={styles.tileLabels}>
        <Text style={styles.tileTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.tileSub} numberOfLines={1}>{subtitle}</Text>
      </View>

      {/* Chevron */}
      <View style={[styles.tileChevron, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name="arrow-right" size={13} color={t.fg} />
      </View>
    </Pressable>
  );
}

// ─── ReceiptRow ───────────────────────────────────────────────────────────────

function ReceiptRow({ item, onPress, isLast }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.receiptRow,
        !isLast && styles.rowDivider,
        { backgroundColor: pressed ? P.surfacePress : P.surface },
      ]}
    >
      {/* Avatar */}
      <View style={styles.receiptAvatar}>
        <MaterialCommunityIcons name="cash-check" size={16} color={P.brand} />
      </View>

      {/* Body */}
      <View style={styles.receiptBody}>
        <View style={styles.receiptTopRow}>
          <Text style={styles.receiptName} numberOfLines={1}>
            {item.block} · {item.flat}
          </Text>
          <Text style={styles.receiptAmt}>{fmtAmount(item.amount)}</Text>
        </View>
        <View style={styles.receiptBottomRow}>
          <Text style={styles.receiptMeta}>
            {item.mode || 'Payment'} · {timeAgo(item.date)}
          </Text>
          <Text style={styles.receiptCta}>View</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── BlockRow ─────────────────────────────────────────────────────────────────

function BlockRow({ item, isLast }) {
  const pct = item.total_flats
    ? Math.max(0, Math.min(100, (item.paid_flats / item.total_flats) * 100))
    : 0;

  const barColor =
    pct >= 75 ? P.emerald :
    pct >= 40 ? P.amber   : P.rose;

  const badgeBg =
    pct >= 75 ? P.emeraldSoft :
    pct >= 40 ? P.amberSoft   : P.roseSoft;

  // Use integer width percentage for RN (string percentages work in flex layouts)
  const fillPct = Math.round(pct);

  return (
    <View style={[styles.blockRow, !isLast && styles.rowDivider]}>
      {/* Icon */}
      <View style={styles.blockIconWrap}>
        <MaterialCommunityIcons name="home-city-outline" size={15} color={P.slate} />
      </View>

      {/* Content */}
      <View style={styles.blockContent}>
        {/* Title + badge */}
        <View style={styles.blockTopRow}>
          <Text style={styles.blockTitle}>Block {item.block}</Text>
          <View style={[styles.pctBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.pctText, { color: barColor }]}>{fillPct}%</Text>
          </View>
        </View>

        {/* Meta */}
        <Text style={styles.blockMeta}>{item.paid_flats} of {item.total_flats} flats paid</Text>

        {/* Progress bar — RN-safe implementation */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                // RN requires a numeric width or a '0%'-style string inside a flex container
                // Use flex trick: flex = pct, companion flex = 100 - pct
                backgroundColor: barColor,
                flex: fillPct,
              },
            ]}
          />
          {fillPct < 100 && (
            <View style={{ flex: 100 - fillPct, backgroundColor: 'transparent' }} />
          )}
        </View>

        {/* Footer */}
        <Text style={styles.blockFoot}>
          {item.pending_flats} pending
          {item.completion_pct ? ` · ${Math.round(item.completion_pct)}% this cycle` : ''}
        </Text>
      </View>
    </View>
  );
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────

function EmptyCard({ icon, title, body }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color={P.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaymentsHubScreen() {
  const { user } = useAuth();
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
        tone: 'primary',
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
          icon: 'receipt-text-plus-outline',
          tone: 'neutral',
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
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={load}
          tintColor={P.brand}
          colors={[P.brand]}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Payments</Text>
          <Text style={styles.headerTitle}>Hub</Text>
        </View>
        <View style={styles.headerRight}>
          <LiveBadge />
          <Pressable
            onPress={() => navigation.navigate('PaymentsList')}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={P.brand} />
          </Pressable>
        </View>
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <View style={styles.statsStrip}>
        <StatCell
          label="TODAY"
          value={data?.today || '—'}
        />
        <View style={styles.statsDivider} />
        <StatCell
          label="PERIOD"
          value={`${data?.month_name || 'Month'} ${data?.year || ''}`}
        />
        <View style={styles.statsDivider} />
        <StatCell
          label="PENDING"
          value={pendingBlocks.length > 0 ? `${pendingBlocks.length} blocks` : 'All clear'}
        />
      </View>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Quick Actions" />
        <View style={styles.tileList}>
          {actionCards.map((card) => (
            <ActionTile key={card.title} {...card} />
          ))}
        </View>
      </View>

      {/* ── Recent Receipts ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel
          title="Recent Receipts"
          actionLabel="All receipts"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {recentPayments.length > 0 ? (
          <View style={styles.card}>
            {recentPayments.map((item, idx) => (
              <ReceiptRow
                key={`${item.block}-${item.flat}-${item.date}-${idx}`}
                item={item}
                isLast={idx === recentPayments.length - 1}
                onPress={() => navigation.navigate('PaymentsList')}
              />
            ))}
          </View>
        ) : (
          <EmptyCard
            icon="progress-clock"
            title="Fetching receipts"
            body="Loading the latest payment activity."
          />
        )}
      </View>

      {/* ── Follow-up Blocks ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel
          title="Follow-up Blocks"
          actionLabel="Open ledger"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {pendingBlocks.length > 0 ? (
          <View style={styles.card}>
            {pendingBlocks.map((item, idx) => (
              <BlockRow
                key={item.block}
                item={item}
                isLast={idx === pendingBlocks.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyCard
            icon="check-circle-outline"
            title="All blocks caught up"
            body="No follow-ups needed for this cycle."
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
    backgroundColor: P.bg,
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
    color: P.brand,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: P.ink,
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
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },

  // ── Live badge ──────────────────────────────────────────────────────────────
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: P.emeraldSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: P.emeraldMid,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P.emerald,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.emerald,
    letterSpacing: 0.3,
  },

  // ── Stats strip ─────────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    marginBottom: 2,
    ...SHADOW_SM,
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
    color: P.inkMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: P.border,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: P.inkSub,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.brand,
  },

  // ── Action tiles ────────────────────────────────────────────────────────────
  tileList: {
    gap: 8,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 14,
    gap: 12,
    ...SHADOW_SM,
  },
  actionTilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  tileStrip: {
    width: 3,
    alignSelf: 'stretch',
    opacity: 0.65,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  tileLabels: {
    flex: 1,
    minWidth: 0,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  tileSub: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkSub,
    lineHeight: 17,
    marginTop: 1,
  },
  tileChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Card container ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    ...SHADOW_MD,
  },

  // ── Row divider ─────────────────────────────────────────────────────────────
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderSubtle,
  },

  // ── Receipt row ─────────────────────────────────────────────────────────────
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  receiptAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  receiptBody: {
    flex: 1,
    minWidth: 0,
  },
  receiptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  receiptName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },
  receiptAmt: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.3,
    flexShrink: 0,
  },
  receiptBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  receiptMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkSub,
  },
  receiptCta: {
    fontSize: 12,
    fontWeight: '700',
    color: P.brand,
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
    backgroundColor: P.slateSoft,
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
    color: P.ink,
    letterSpacing: -0.2,
  },
  blockMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkSub,
    marginBottom: 8,
  },
  pctBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexShrink: 0,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Progress bar — uses flexDirection row + flex ratio (RN-safe, no % widths)
  progressTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: 999,
    backgroundColor: P.borderSubtle,
    overflow: 'hidden',
    marginBottom: 7,
  },
  progressFill: {
    height: 5,
    borderRadius: 999,
  },

  blockFoot: {
    fontSize: 11,
    fontWeight: '500',
    color: P.inkMuted,
  },

  // ── Empty card ──────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 6,
    ...SHADOW_SM,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    color: P.inkSub,
    textAlign: 'center',
  },
});