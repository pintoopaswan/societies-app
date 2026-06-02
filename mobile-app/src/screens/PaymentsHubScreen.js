import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { typography } from '../lib/theme';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function fmtDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return String(value);
  }
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

// ─── Design tokens (shared with DashboardScreen) ──────────────────────────────

const PALETTE = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',

  ink: '#0F0F10',
  inkSecondary: '#6B7280',
  inkTertiary: '#9CA3AF',

  blue: '#2563EB',
  blueSoft: '#EFF4FF',
  blueMid: '#DBEAFE',

  indigo: '#4F46E5',
  indigoSoft: '#EEF2FF',

  emerald: '#059669',
  emeraldSoft: '#ECFDF5',

  amber: '#D97706',
  amberSoft: '#FFFBEB',

  rose: '#E11D48',
  roseSoft: '#FFF1F2',

  slate: '#475569',
  slateSoft: '#F1F5F9',

  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
};

const ACTION_PALETTE = {
  primary: { bg: PALETTE.blueSoft,    fg: PALETTE.blue,    ring: PALETTE.blueMid },
  accent:  { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo,  ring: '#C7D2FE' },
  success: { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald, ring: '#A7F3D0' },
  warning: { bg: PALETTE.amberSoft,   fg: PALETTE.amber,   ring: '#FDE68A' },
  danger:  { bg: PALETTE.roseSoft,    fg: PALETTE.rose,    ring: '#FECDD3' },
  neutral: { bg: PALETTE.slateSoft,   fg: PALETTE.slate,   ring: '#CBD5E1' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge — same as Dashboard */
function Pill({ label, color, bg, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={11} color={color} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Section header with optional "See all" pill action */
function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.blue} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** 2-column action card — identical pattern to Dashboard */
function ActionCard({ title, subtitle, icon, tone = 'primary', onPress }) {
  const p = ACTION_PALETTE[tone] || ACTION_PALETTE.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.actionAccentBar, { backgroundColor: p.fg, opacity: 0.12 }]} />
      <View style={[styles.actionIconWrap, { backgroundColor: p.bg, borderColor: p.ring }]}>
        <MaterialCommunityIcons name={icon} size={22} color={p.fg} />
      </View>
      <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>
      <View style={styles.actionChevronWrap}>
        <MaterialCommunityIcons name="arrow-right" size={14} color={p.fg} />
      </View>
    </Pressable>
  );
}

/** Receipt row inside the grouped card */
function ReceiptRow({ item, onPress, isLast }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.receiptRow,
        !isLast && styles.receiptRowBorder,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* left icon */}
      <View style={[styles.receiptIcon, { backgroundColor: PALETTE.blueSoft }]}>
        <MaterialCommunityIcons name="cash-check" size={17} color={PALETTE.blue} />
      </View>

      {/* content */}
      <View style={styles.receiptContent}>
        <View style={styles.receiptTitleRow}>
          <Text style={styles.receiptTitle} numberOfLines={1}>
            {item.block} · {item.flat}
          </Text>
          <Text style={styles.receiptAmount}>{fmtAmount(item.amount)}</Text>
        </View>
        <View style={styles.receiptMetaRow}>
          <Text style={styles.receiptMeta}>
            {item.mode || 'Payment'} · {timeAgo(item.date)}
          </Text>
          <Text style={styles.receiptLink}>Open ledger</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Block follow-up row with slim progress bar */
function BlockRow({ item, isLast }) {
  const completion = item.total_flats
    ? Math.max(0, Math.min(100, (item.paid_flats / item.total_flats) * 100))
    : 0;

  // Colour the progress bar by completion level
  const barColor =
    completion >= 75 ? PALETTE.emerald :
    completion >= 40 ? PALETTE.amber :
    PALETTE.rose;

  const barBg =
    completion >= 75 ? PALETTE.emeraldSoft :
    completion >= 40 ? PALETTE.amberSoft :
    PALETTE.roseSoft;

  return (
    <View
      style={[
        styles.blockRow,
        !isLast && styles.blockRowBorder,
      ]}
    >
      {/* block label + percent */}
      <View style={styles.blockTopRow}>
        <View style={styles.blockLeft}>
          <View style={[styles.blockIconWrap, { backgroundColor: PALETTE.slateSoft }]}>
            <MaterialCommunityIcons name="home-city-outline" size={16} color={PALETTE.slate} />
          </View>
          <View>
            <Text style={styles.blockTitle}>Block {item.block}</Text>
            <Text style={styles.blockMeta}>
              {item.paid_flats} of {item.total_flats} flats paid
            </Text>
          </View>
        </View>
        <View style={[styles.percentPill, { backgroundColor: barBg }]}>
          <Text style={[styles.percentText, { color: barColor }]}>
            {Math.round(completion)}%
          </Text>
        </View>
      </View>

      {/* progress track */}
      <View style={[styles.track, { backgroundColor: PALETTE.borderSoft }]}>
        <View style={[styles.trackFill, { width: `${completion}%`, backgroundColor: barColor }]} />
      </View>

      <Text style={styles.blockFoot}>
        {item.pending_flats} pending
        {item.completion_pct ? ` · ${Math.round(item.completion_pct)}% cycle` : ''}
      </Text>
    </View>
  );
}

/** Empty / loading state */
function EmptyState({ icon, title, body }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
        <MaterialCommunityIcons name={icon} size={26} color={PALETTE.blue} />
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

  // ─── Action cards ──────────────────────────────────────────────────────────

  const actionCards = useMemo(() => {
    const base = [
      { title: 'Payment Ledger',  subtitle: 'Browse and filter receipts',  icon: 'file-table-outline',         tone: 'primary', onPress: () => navigation.navigate('PaymentsList') },
      { title: 'Payment Info',    subtitle: 'UPI or QR details',            icon: 'qrcode',                     tone: 'accent',  onPress: () => navigation.navigate('PaymentInfo') },
      { title: 'Expenses',        subtitle: 'Expense and balance view',     icon: 'cash-minus',                 tone: 'warning', onPress: () => navigation.navigate('ExpensesList') },
      { title: 'Support',         subtitle: 'Complaints and helpdesk',      icon: 'lifebuoy',                   tone: 'danger',  onPress: () => navigation.navigate('Helpdesk') },
    ];
    if (canManage) {
      return [
        { title: 'Add Payment',  subtitle: 'Create a new receipt',         icon: 'cash-plus',                   tone: 'success', onPress: () => navigation.navigate('NewPayment') },
        { title: 'Add Expense',  subtitle: 'Log a society expense',        icon: 'receipt-text-plus-outline',   tone: 'warning', onPress: () => navigation.navigate('NewExpense') },
        ...base,
      ];
    }
    return base;
  }, [canManage, navigation]);

  const recentPayments = (data?.recent_payments || []).slice(0, 5);
  const pendingBlocks  = (data?.top_pending_blocks || []).slice(0, 5);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Page
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={PALETTE.blue} />
      }
      style={{ backgroundColor: PALETTE.bg }}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroPillsRow}>
              <Pill label="Payments" color={PALETTE.blue}    bg={PALETTE.blueSoft} />
              <Pill label="Live"     color={PALETTE.emerald} bg={PALETTE.emeraldSoft} icon="circle-medium" />
            </View>
            <Text style={styles.heroTitle}>Receipts, dues &amp;{'\n'}payment entry</Text>
            <Text style={styles.heroSubtitle}>
              A calm hub for all payment workflows — fast access without the clutter.
            </Text>
          </View>

          {/* top-right shortcut to full ledger */}
          <Pressable
            onPress={() => navigation.navigate('PaymentsList')}
            style={({ pressed }) => [
              styles.heroButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="arrow-right" size={20} color={PALETTE.blue} />
          </Pressable>
        </View>

        {/* context pills row */}
        <View style={styles.heroContextRow}>
          <View style={styles.heroContextPill}>
            <Text style={styles.heroContextLabel}>Today</Text>
            <Text style={styles.heroContextValue}>{data?.today || '—'}</Text>
          </View>
          <View style={styles.heroContextPill}>
            <Text style={styles.heroContextLabel}>Period</Text>
            <Text style={styles.heroContextValue}>
              {data?.month_name || 'Month'} {data?.year || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          {actionCards.map((item) => (
            <ActionCard key={item.title} {...item} />
          ))}
        </View>
      </View>

      {/* ── Recent Receipts ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Receipts"
          actionLabel="Full ledger"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {recentPayments.length > 0 ? (
          <View style={styles.groupCard}>
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
          <EmptyState
            icon="progress-clock"
            title="Loading receipts"
            body="We're fetching the latest payments from the server."
          />
        )}
      </View>

      {/* ── Follow-up Blocks ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Follow-up Blocks"
          actionLabel="Open ledger"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        {pendingBlocks.length > 0 ? (
          <View style={styles.groupCard}>
            {pendingBlocks.map((item, idx) => (
              <BlockRow
                key={item.block}
                item={item}
                isLast={idx === pendingBlocks.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="home-alert-outline"
            title="No follow-up items"
            body="All blocks are caught up for the current cycle."
          />
        )}
      </View>

      <View style={{ height: 40 }} />
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({

  // ── Pill ──────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  blobA: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(37, 99, 235, 0.07)',
  },
  blobB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.6,
    fontFamily: typography?.display || undefined,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  heroButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PALETTE.blueSoft,
    borderWidth: 1,
    borderColor: PALETTE.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroContextRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroContextPill: {
    flex: 1,
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: 14,
    padding: 13,
  },
  heroContextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  heroContextValue: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
    fontFamily: typography?.heading || undefined,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PALETTE.blueSoft,
    borderRadius: 999,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Action grid ───────────────────────────────────────────────────────────
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48.5%',
    backgroundColor: PALETTE.surface,
    borderRadius: 20,
    padding: 16,
    minHeight: 148,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  actionAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  actionChevronWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },

  // ── Grouped card (receipts + blocks) ──────────────────────────────────────
  groupCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  // ── Receipt row ───────────────────────────────────────────────────────────
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  receiptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.borderSoft,
  },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  receiptContent: {
    flex: 1,
    minWidth: 0,
  },
  receiptTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  receiptTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  receiptMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  receiptLink: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Block row ─────────────────────────────────────────────────────────────
  blockRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  blockRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.borderSoft,
  },
  blockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  blockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  blockIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  blockMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  percentPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
  blockFoot: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.border,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
    ...CARD_SHADOW,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    textAlign: 'center',
  },
});