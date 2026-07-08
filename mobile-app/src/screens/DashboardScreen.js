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
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  ActivityRow,
  NoticeCard as DSNoticeCard,
  Surface,
  EmptyState,
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
  const { colors, radius, shadow } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Surface tone="elevated" style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Choose home</Text>
          <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Switch dashboard to another flat.</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 20 }}
            contentContainerStyle={{ gap: 10 }}
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
                      backgroundColor: active ? colors.accentSoft : colors.surfaceSoft,
                      borderColor: active ? colors.primaryBlue : colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={[styles.flatOptionIcon, { backgroundColor: active ? colors.primaryBlue + '20' : colors.border }]}>
                    <MaterialCommunityIcons
                      name="home-city-outline"
                      size={18}
                      color={active ? colors.primaryBlue : colors.muted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flatOptionTitle, { color: active ? colors.primaryBlue : colors.text }]}>
                      {item.block} · {item.flat}
                    </Text>
                    <Text style={[styles.flatOptionMeta, { color: colors.muted }]}>Tap to switch</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primaryBlue} />
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

  // Society name — derive from dashboard or fall back to a sensible default
  const societyName = dashboard?.society_name || 'MIG-1 Society';

  const ownerName = activeOwner?.owner_name || '';

  // ─── Quick actions (role-aware) ───────────────────────────────────────────

  const quickActions = useMemo(() => {
    const base = [
      { title: 'Pay Maintenance',      subtitle: 'UPI & QR details',          icon: 'qrcode-scan',                    tone: 'default', onPress: () => navigation.navigate('PaymentInfo')   },
      { title: 'Payment History',      subtitle: 'Receipts & timeline',        icon: 'receipt-text-outline',           tone: 'success', onPress: () => navigation.navigate('PaymentsList')  },
      { title: 'Fund Ledger',          subtitle: 'Ledger & accounts',          icon: 'book-open-page-variant-outline', tone: 'indigo',  onPress: () => navigation.navigate('PaymentsHub')   },
      { title: 'Notices',              subtitle: 'Announcements',              icon: 'bell-outline',                   tone: 'warning', onPress: () => navigation.navigate('Notices')       },
      { title: 'Complaints',           subtitle: 'Raise or track issues',      icon: 'message-alert-outline',          tone: 'danger',  onPress: () => navigation.navigate('Complaints')    },
      { title: 'Residents Directory',  subtitle: 'People & homes',             icon: 'account-group-outline',          tone: 'slate',   onPress: () => navigation.navigate('Directory')     },
    ];

    if (isAdmin) return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo',  onPress: () => navigation.navigate('ExpensesList')          },
      { title: 'Pending Requests',     subtitle: pendingCount > 0 ? `${pendingCount} awaiting` : 'Approvals', icon: 'account-clock-outline', tone: 'danger', onPress: () => navigation.navigate('AdminRegistrationRequests') },
      { title: 'Add Payment',          subtitle: 'Record a payment',           icon: 'cash-plus',                      tone: 'success', onPress: () => navigation.navigate('NewPayment')            },
      { title: 'Add Expense',          subtitle: 'Log an expense',             icon: 'receipt-text-plus-outline',      tone: 'warning', onPress: () => navigation.navigate('NewExpense')            },
    ];

    if (isOwner) return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo',  onPress: () => navigation.navigate('ExpensesList')          },
    ];

    return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo',  onPress: () => navigation.navigate('ExpensesList')          },
      { title: 'Owner Details',        subtitle: 'Your landlord info',         icon: 'home-city-outline',              tone: 'default',
        onPress: () => activeOwner?.property_id
          ? navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })
          : Alert.alert('Info', 'No owner details available yet.'),
      },
    ];
  }, [activeOwner?.property_id, isAdmin, isOwner, navigation, pendingCount]);

  // ─── Activity feed ─────────────────────────────────────────────────────────

  const recentPayments = (dashboard?.recent_payments || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check', tone: 'payment',
    title: 'Payment received',
    subtitle: `${item.block} ${item.flat} · ${fmtAmount(item.amount)} · ${item.mode || 'UPI'}`,
    time: formatRelativeTime(item.date),
  }));

  const personalPayments = (personalSummary?.entries || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check', tone: 'payment',
    title: 'Your payment',
    subtitle: `${fmtAmount(item.amount)} · ${item.mode_of_payment || 'Payment'}`,
    time: formatRelativeTime(item.payment_date || item.date),
  }));

  const noticeActivity = notices.slice(0, 2).map((item) => ({
    kind: 'notice', icon: 'bell-ring-outline', tone: 'notice',
    title: item.title,
    subtitle: truncate(item.body, 80),
    time: formatRelativeTime(item.published_at || item.created_at),
  }));

  const complaintActivity = complaints.slice(0, 2).map((item) => ({
    kind: 'complaint', icon: 'message-alert-outline', tone: 'complaint',
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.appBg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 56 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primaryBlue}
          colors={[colors.primaryBlue]}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={[styles.headerGreeting, { color: colors.muted }]}>{greeting},</Text>
          <Text style={[styles.headerName, { color: colors.text }]}>{displayName}</Text>
          {societyName ? (
            <Text style={[styles.headerMeta, { color: colors.muted }]} numberOfLines={1}>{societyName}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Flat switcher pill — owners with ≥1 flat ───────────────────────── */}
      {isOwner && flatOptions.length > 0 && (
        <Pressable
          onPress={() => flatOptions.length > 1 && setFlatPickerOpen(true)}
          style={({ pressed }) => [
            styles.flatSwitcherPill,
            { backgroundColor: colors.accentSoft, borderColor: colors.primaryBlue + '40' },
            flatOptions.length > 1 && pressed && { opacity: 0.8 },
          ]}
        >
          <View style={[styles.flatSwitcherIconWrap, { backgroundColor: colors.primaryBlue + '20' }]}>
            <MaterialCommunityIcons name="home-city-outline" size={15} color={colors.primaryBlue} />
          </View>
          <Text style={[styles.flatSwitcherLabel, { color: colors.primaryBlue }]} numberOfLines={1}>
            {selectedFlat ? `${selectedFlat.block} · Flat ${selectedFlat.flat}` : 'Select flat'}
          </Text>
          {flatOptions.length > 1 && (
            <>
              <View style={[styles.flatSwitcherDivider, { backgroundColor: colors.primaryBlue + '40' }]} />
              <Text style={[styles.flatSwitcherCount, { color: colors.primaryBlue }]}>
                {flatOptions.length} flats
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={colors.primaryBlue} />
            </>
          )}
        </Pressable>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <QuickAction key={item.title} {...item} />
          ))}
        </View>
      </View>

      {/* ── Important Notices ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Notices"
          actionLabel="See all"
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
          actionLabel="View all"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        <Surface style={{ padding: 0 }}>
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
              title="No recent activity"
              subtitle="Payments, notices and updates will appear here."
            />
          )}
        </Surface>
      </View>

      {/* ── Your Home (Owner / Tenant) ─────────────────────────────────────── */}
      {(isOwner || isTenant) ? (
        <View style={styles.section}>
          <SectionHeader title="Your Home" />
          <Surface style={{ padding: 0 }}>
            <ActivityRow
              title="Current flat"
              subtitle={homeLabel || 'Not set'}
              icon="home-city-outline"
              tone="default"
              onPress={() => { if (isOwner && flatOptions.length > 1) setFlatPickerOpen(true); }}
            />
            <ActivityRow
              title="Owner"
              subtitle={ownerName || 'Available soon'}
              icon="account-tie-outline"
              tone="indigo"
              isLast
              onPress={() =>
                activeOwner?.property_id
                  ? navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })
                  : undefined
              }
            />
          </Surface>
        </View>
      ) : null}

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  headerTextGroup: {
    flex: 1,
    gap: 2,
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0,
  },

  // ── Flat switcher pill ────────────────────────────────────────────────────
  flatSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  flatSwitcherIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatSwitcherLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    maxWidth: 180,
  },
  flatSwitcherDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 1,
  },
  flatSwitcherCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 28,
  },

  // ── Action grid ───────────────────────────────────────────────────────────
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // ── Notice cards ──────────────────────────────────────────────────────────
  noticeStack: {
    gap: 10,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  modalSheet: {
    borderRadius: 28,
    padding: 20,
    maxHeight: '72%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  flatOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  flatOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  flatOptionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
});