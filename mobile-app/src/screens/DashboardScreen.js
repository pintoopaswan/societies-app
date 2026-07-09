import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  ActivityRow,
  NoticeCard as DSNoticeCard,
  Surface,
  EmptyState,
  StatCard,
  Sparkline,
} from '../components/DesignSystem';

// ─── Utility helpers ─────────────────────────────────────────────────────────

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function formatRelativeTime(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return String(value);
  }
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Flat-picker bottom-sheet modal */
function FlatPicker({ visible, flatOptions, selectedFlat, onSelect, onClose }) {
  const { colors, radius, elevation } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose}>
        <Surface level={2} style={[styles.modalSheet, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.outlineVariant }]} />
          <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Choose home</Text>
          <Text style={[styles.modalSubtitle, { color: colors.onSurfaceVariant }]}>Switch dashboard to another flat.</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 24 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          >
            {flatOptions.map((item) => {
              const active = selectedFlat?.block === item.block && selectedFlat?.flat === item.flat;
              return (
                <Pressable
                  key={`${item.block}-${item.flat}`}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.flatOptionRow,
                    {
                      backgroundColor: active ? colors.primaryContainer : colors.surfaceContainerLow,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={[styles.flatOptionIcon, { backgroundColor: active ? colors.onPrimary : colors.surfaceContainerHighest }]}>
                    <MaterialCommunityIcons
                      name="home-city-outline"
                      size={20}
                      color={active ? colors.primary : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flatOptionTitle, { color: active ? colors.onPrimaryContainer : colors.onSurface }]}>
                      {item.block} · {item.flat}
                    </Text>
                    <Text style={[styles.flatOptionMeta, { color: colors.onSurfaceVariant }]}>Tap to switch</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Surface>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, token, getRegistrationRequests } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useAppTheme();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const isTenant = role === 'TENANT';

  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [notices, setNotices] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOwner, setActiveOwner] = useState(null);
  const [flatOptions, setFlatOptions] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(
    user?.block && user?.flat ? { block: user.block, flat: user.flat } : null,
  );
  const [flatPickerOpen, setFlatPickerOpen] = useState(false);
  const [personalSummary, setPersonalSummary] = useState(null);
  const selectedFlatRef = useRef(selectedFlat);

  useEffect(() => {
    selectedFlatRef.current = selectedFlat;
  }, [selectedFlat]);

  // ─── Data loaders ──────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    try {
      const res = await apiRequest('/api/dashboard');
      setDashboard(res.data || null);
    } catch {
      setDashboard(null);
    }
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const res = await apiRequest('/api/notices');
      setNotices((res.data || []).slice(0, 5));
    } catch {
      setNotices([]);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    if (!token) { setComplaints([]); return; }
    try {
      const res = await apiRequest('/api/complaints', {}, token);
      setComplaints((res.data || []).slice(0, 5));
    } catch {
      setComplaints([]);
    }
  }, [token]);

  const loadPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const rows = await getRegistrationRequests();
      setPendingCount((rows || []).filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length);
    } catch {
      setPendingCount(0);
    }
  }, [getRegistrationRequests, isAdmin]);

  const loadActiveOwner = useCallback(async () => {
    if (!isTenant || !user?.block || !user?.flat) return;
    try {
      const p = new URLSearchParams({ block: user.block, flat: user.flat });
      const res = await apiRequest(`/api/owners?${p.toString()}`);
      setActiveOwner((res.data || [])[0] || null);
    } catch {
      setActiveOwner(null);
    }
  }, [isTenant, user?.block, user?.flat]);

  const loadFlatOptions = useCallback(async () => {
    const fallback = user?.block && user?.flat ? [{ block: user.block, flat: user.flat }] : [];
    if (isOwner && user?.mobile) {
      try {
        const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
        const rows = (res.data || []).map((i) => ({ block: i.block, flat: i.flat }));
        const next = rows.length > 0 ? rows : fallback;
        setFlatOptions(next);
        setSelectedFlat((prev) =>
          next.find((i) => i.block === prev?.block && i.flat === prev?.flat) || next[0] || null,
        );
        return next;
      } catch {
        setFlatOptions(fallback);
        setSelectedFlat(fallback[0] || null);
        return fallback;
      }
    }
    setFlatOptions(fallback);
    setSelectedFlat(fallback[0] || null);
    return fallback;
  }, [isOwner, user?.block, user?.flat, user?.mobile]);

  const loadPersonalPayments = useCallback(async (flat) => {
    if (!flat?.block || !flat?.flat) { setPersonalSummary(null); return; }
    try {
      const q = new URLSearchParams({ block: flat.block, flat: flat.flat, scope: 'all' });
      const res = await apiRequest(`/api/payments?${q.toString()}`);
      setPersonalSummary(res.data || null);
    } catch {
      setPersonalSummary(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboard(), loadNotices(), loadComplaints(),
        loadPendingCount(), loadActiveOwner(), loadFlatOptions(),
      ]);
      const flat = selectedFlatRef.current ||
        (user?.block && user?.flat ? { block: user.block, flat: user.flat } : null);
      if (flat && (isOwner || isTenant)) await loadPersonalPayments(flat);
    } finally {
      setRefreshing(false);
    }
  }, [isOwner, isTenant, loadActiveOwner, loadComplaints, loadDashboard, loadFlatOptions, loadNotices, loadPendingCount, loadPersonalPayments, user?.block, user?.flat]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const run = async () => {
        setRefreshing(true);
        try {
          await Promise.all([
            loadDashboard(), loadNotices(), loadComplaints(),
            loadPendingCount(), loadActiveOwner(), loadFlatOptions(),
          ]);
          const flat = selectedFlatRef.current ||
            (user?.block && user?.flat ? { block: user.block, flat: user.flat } : null);
          if (flat && active && (isOwner || isTenant)) await loadPersonalPayments(flat);
        } finally {
          if (active) setRefreshing(false);
        }
      };
      run();
      return () => { active = false; };
    }, [isOwner, isTenant, loadActiveOwner, loadComplaints, loadDashboard, loadFlatOptions, loadNotices, loadPendingCount, loadPersonalPayments, user?.block, user?.flat]),
  );

  useEffect(() => {
    if (!isOwner && !isTenant) return;
    const flat = selectedFlatRef.current;
    if (flat?.block && flat?.flat) loadPersonalPayments(flat);
  }, [isOwner, isTenant, loadPersonalPayments, selectedFlat]);

  // ─── Derived values ────────────────────────────────────────────────────────

  const greeting = getGreeting();
  const displayName = (user?.name || 'there').split(' ')[0];

  const homeLabel = useMemo(() => {
    const block = selectedFlat?.block || user?.block;
    const flat  = selectedFlat?.flat  || user?.flat;
    if (block && flat) return `${block} · Flat ${flat}`;
    return null;
  }, [selectedFlat?.block, selectedFlat?.flat, user?.block, user?.flat]);

  const societyName = dashboard?.society_name || 'MIG-1 Society';
  const ownerName = activeOwner?.owner_name || '';

  // ─── Quick actions (role-aware) ───────────────────────────────────────────

  const quickActions = useMemo(() => {
    const base = [
      { title: 'Pay',      subtitle: 'UPI & QR',          icon: 'qrcode-scan',                    tone: 'primary', onPress: () => navigation.navigate('PaymentInfo')   },
      { title: 'History',      subtitle: 'Receipts',        icon: 'receipt-text-outline',           tone: 'secondary', onPress: () => navigation.navigate('PaymentsList')  },
      { title: 'Ledger',          subtitle: 'Fund status',          icon: 'book-open-outline', tone: 'secondary',  onPress: () => navigation.navigate('PaymentsHub')   },
      { title: 'Directory',  subtitle: 'People',             icon: 'account-group-outline',          tone: 'secondary',   onPress: () => navigation.navigate('Directory')     },
    ];

    if (isAdmin) return [
      ...base,
      { title: 'Requests',     subtitle: pendingCount > 0 ? `${pendingCount} awaiting` : 'Approvals', icon: 'account-clock-outline', tone: 'primary', onPress: () => navigation.navigate('AdminRegistrationRequests') },
      { title: 'Add Pay',          subtitle: 'Record',           icon: 'cash-plus',                      tone: 'primary', onPress: () => navigation.navigate('NewPayment')            },
    ];

    return base;
  }, [isAdmin, navigation, pendingCount]);

  // ─── Activity feed ─────────────────────────────────────────────────────────

  const recentPayments = (dashboard?.recent_payments || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check', tone: 'default',
    title: 'Payment received',
    subtitle: `${item.block} ${item.flat} · ${fmtAmount(item.amount)}`,
    time: formatRelativeTime(item.date),
  }));

  const personalPayments = (personalSummary?.entries || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check', tone: 'default',
    title: 'Your payment',
    subtitle: `${fmtAmount(item.amount)} · ${item.mode_of_payment}`,
    time: formatRelativeTime(item.payment_date || item.date),
  }));

  const noticeActivity = notices.slice(0, 2).map((item) => ({
    kind: 'notice', icon: 'bell-outline', tone: 'default',
    title: item.title,
    subtitle: truncate(item.body, 80),
    time: formatRelativeTime(item.published_at || item.created_at),
  }));

  const complaintActivity = complaints.slice(0, 2).map((item) => ({
    kind: 'complaint', icon: 'message-alert-outline', tone: 'danger',
    title: item.title,
    subtitle: truncate(item.description, 80),
    time: formatRelativeTime(item.updated_at || item.created_at),
  }));

  const activityItems = useMemo(() => {
    const items = isAdmin
      ? [...recentPayments, ...noticeActivity, ...complaintActivity]
      : [...personalPayments, ...noticeActivity, ...complaintActivity];
    return items.slice(0, 6);
  }, [complaintActivity, isAdmin, noticeActivity, personalPayments, recentPayments]);

  const importantNotices = useMemo(() => notices.slice(0, 3), [notices]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!dashboard) return [];
    if (isAdmin) {
      return [
        { label: 'Total Collection', value: fmtAmount(dashboard.total_collection || 0), icon: 'cash-multiple', tone: 'primary', delta: '+12%' },
        { label: 'Pending Approvals', value: pendingCount, icon: 'account-clock', tone: 'secondary', delta: pendingCount > 5 ? '+2' : undefined },
        { label: 'Active Complaints', value: dashboard.active_complaints || 0, icon: 'alert-circle', tone: 'primary' },
        { label: 'Total Residents', value: dashboard.total_residents || 0, icon: 'account-group', tone: 'secondary' },
      ];
    }
    const due = personalSummary?.total_due || 0;
    return [
      { label: 'Outstanding Due', value: fmtAmount(due), icon: 'alert-circle', tone: due > 0 ? 'primary' : 'secondary' },
      { label: 'Last Payment', value: personalSummary?.entries?.[0] ? fmtAmount(personalSummary.entries[0].amount) : '₹0', icon: 'cash-check', tone: 'secondary' },
    ];
  }, [dashboard, isAdmin, pendingCount, personalSummary]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 88 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerGreeting, { color: colors.onSurfaceVariant }]}>{greeting},</Text>
          <Text style={[styles.headerName, { color: colors.onSurface }]}>{displayName}</Text>
          <View style={styles.societyRow}>
            <MaterialCommunityIcons name="office-building" size={14} color={colors.primary} />
            <Text style={[styles.headerMeta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{societyName}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          style={({pressed}) => [styles.profileBtn, { backgroundColor: colors.surfaceContainerHighest, opacity: pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="account" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      {/* ── Flat switcher pill ─────────────────────────────────────────────── */}
      {isOwner && flatOptions.length > 1 && (
        <Pressable
          onPress={() => setFlatPickerOpen(true)}
          style={({ pressed }) => [
            styles.flatSwitcherPill,
            { backgroundColor: colors.secondaryContainer, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="home-city" size={16} color={colors.onSecondaryContainer} />
          <Text style={[styles.flatSwitcherLabel, { color: colors.onSecondaryContainer }]}>
            {selectedFlat ? `${selectedFlat.block} · ${selectedFlat.flat}` : 'Select flat'}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.onSecondaryContainer} />
        </Pressable>
      )}

      {/* ── Stats Grid ─────────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <View style={styles.statsGrid}>
          {stats.map((s, idx) => (
            <StatCard key={idx} {...s} />
          ))}
        </View>
      )}

      {/* ── Trends (Admin only) ─────────────────────────────────────────────── */}
      {isAdmin && (
        <Surface level={1} style={styles.trendsSection}>
          <Text style={[styles.trendsTitle, { color: colors.onSurface }]}>Collection Trends</Text>
          <Sparkline values={[4500, 5200, 4800, 6100, 5900, 7200]} />
        </Surface>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          {quickActions.map((item, idx) => (
            <QuickAction key={idx} {...item} />
          ))}
        </View>
      </View>

      {/* ── Important Notices ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Notices"
          actionLabel="View all"
          onAction={() => navigation.navigate('Notices')}
        />
        {importantNotices.length > 0 ? (
          <View style={styles.noticeStack}>
            {importantNotices.map((item) => (
              <DSNoticeCard
                key={String(item.id)}
                title={item.title}
                body={item.body}
                category={item.category || 'GENERAL'}
                time={formatRelativeTime(item.published_at || item.created_at)}
                onToggle={() => navigation.navigate('Notices')}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="bell-outline"
            title="No notices yet"
            subtitle="Community announcements will appear here."
          />
        )}
      </View>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Activity"
          actionLabel="History"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        <Surface level={1} style={{ padding: 0 }}>
          {activityItems.length > 0 ? (
            activityItems.map((item, idx) => (
              <ActivityRow
                key={`${item.kind}-${idx}`}
                title={item.title}
                subtitle={item.subtitle}
                time={item.time}
                icon={item.icon}
                tone={item.tone}
                isLast={idx === activityItems.length - 1}
                onPress={() => {
                  if (item.kind === 'payment')   return navigation.navigate('PaymentsList');
                  if (item.kind === 'notice')    return navigation.navigate('Notices');
                  if (item.kind === 'complaint') return navigation.navigate('Complaints');
                }}
              />
            ))
          ) : (
            <EmptyState
              icon="progress-clock"
              title="No activity"
              subtitle="Everything is up to date."
            />
          )}
        </Surface>
      </View>

      {/* Flat picker modal */}
      <FlatPicker
        visible={flatPickerOpen}
        flatOptions={flatOptions}
        selectedFlat={selectedFlat}
        onSelect={(item) => {
          setSelectedFlat(item);
          setFlatPickerOpen(false);
          loadPersonalPayments(item);
        }}
        onClose={() => setFlatPickerOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTextGroup: { flex: 1, gap: 2 },
  headerGreeting: { ...typography.labelLarge },
  headerName: { ...typography.headlineMedium, fontWeight: '700' },
  societyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerMeta: { ...typography.bodySmall },
  profileBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    marginBottom: 24,
  },
  flatSwitcherLabel: { ...typography.labelLarge, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  trendsSection: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 24,
  },
  trendsTitle: { ...typography.titleSmall, fontWeight: '700', marginBottom: 16 },
  section: { marginTop: 12, marginBottom: 24 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  noticeStack: { gap: 12 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: 24,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: { ...typography.headlineSmall, textAlign: 'center' },
  modalSubtitle: { ...typography.bodyMedium, textAlign: 'center', marginTop: 4 },
  flatOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 16,
    gap: 16,
  },
  flatOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatOptionTitle: { ...typography.titleMedium, fontWeight: '700' },
  flatOptionMeta: { ...typography.bodySmall, marginTop: 2 },
});
