import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';

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

// ─── Design tokens ────────────────────────────────────────────────────────────

const PALETTE = {
  // Backgrounds
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F7',

  // Text
  ink: '#0D0F12',
  inkSecondary: '#5C6470',
  inkTertiary: '#9EA5B0',

  // Accents
  blue: '#1D6AF0',
  blueSoft: '#EBF2FF',
  blueMid: '#D4E5FD',

  indigo: '#4F46E5',
  indigoSoft: '#EEF0FD',

  emerald: '#059669',
  emeraldSoft: '#EAFAF4',

  amber: '#C07818',
  amberSoft: '#FDF6E8',

  rose: '#DC2C55',
  roseSoft: '#FFF0F3',

  slate: '#475569',
  slateSoft: '#F0F2F5',

  // Borders
  border: '#E8EAED',
  borderFaint: '#F2F4F6',

  // Overlay
  overlay: 'rgba(0,0,0,0.40)',
};

const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 26,
  pill: 999,
};

// Consistent card shadow — single source of truth
const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0D0F12',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

const ACTION_PALETTE = {
  blue:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue,    ring: PALETTE.blueMid },
  indigo: { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo,  ring: '#C5CBF9' },
  green:  { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald, ring: '#A7F3D0' },
  amber:  { bg: PALETTE.amberSoft,   fg: PALETTE.amber,   ring: '#F5DCAA' },
  red:    { bg: PALETTE.roseSoft,    fg: PALETTE.rose,    ring: '#FDC5D2' },
  slate:  { bg: PALETTE.slateSoft,   fg: PALETTE.slate,   ring: '#D1D8E0' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Section header with optional "See all" link */
function SectionHeader({ title, onAction, actionLabel }) {
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

/** 2-column quick-action card — primary nav element */
function ActionCard({ title, subtitle, icon, tone = 'blue', onPress }) {
  const p = ACTION_PALETTE[tone] || ACTION_PALETTE.blue;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { transform: [{ scale: pressed ? 0.975 : 1 }], opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: p.bg, borderColor: p.ring }]}>
        <MaterialCommunityIcons name={icon} size={22} color={p.fg} />
      </View>
      <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>
      ) : null}
      <View style={styles.actionChevronWrap}>
        <MaterialCommunityIcons name="arrow-right" size={13} color={p.fg} />
      </View>
    </Pressable>
  );
}

/** Activity feed row — clean, no timeline decoration */
function ActivityRow({ item, onPress, isLast }) {
  const toneMap = {
    payment:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
    notice:    { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
    complaint: { bg: PALETTE.roseSoft,    fg: PALETTE.rose    },
    update:    { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
  };
  const t = toneMap[item.kind] || { bg: PALETTE.slateSoft, fg: PALETTE.slate };

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.activityRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <View style={[styles.activityIcon, { backgroundColor: t.bg }]}>
          <MaterialCommunityIcons name={item.icon} size={16} color={t.fg} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
          <Text style={styles.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color={PALETTE.inkTertiary} />
      </Pressable>
      {!isLast && <View style={styles.activityDivider} />}
    </>
  );
}

/** Notice card — left accent stripe, clean typography */
function NoticeCard({ item, onPress }) {
  const categoryColors = {
    GENERAL:     { bg: PALETTE.slateSoft,   fg: PALETTE.slate   },
    MAINTENANCE: { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
    EMERGENCY:   { bg: PALETTE.roseSoft,    fg: PALETTE.rose    },
    EVENT:       { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
    FINANCE:     { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
  };
  const cat = String(item.category || 'GENERAL').toUpperCase();
  const c = categoryColors[cat] || categoryColors.GENERAL;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noticeCard,
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View style={[styles.noticeStripe, { backgroundColor: c.fg }]} />
      <View style={styles.noticeBody}>
        <View style={styles.noticeTopRow}>
          <View style={[styles.noticeCategoryPill, { backgroundColor: c.bg }]}>
            <Text style={[styles.noticeCategoryText, { color: c.fg }]}>{cat}</Text>
          </View>
          <Text style={styles.noticeTime}>{item.time}</Text>
        </View>
        <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.noticeExcerpt} numberOfLines={2}>{item.body}</Text>
        <View style={styles.noticeFooter}>
          <Text style={styles.noticeReadMore}>Read more</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.blue} />
        </View>
      </View>
    </Pressable>
  );
}

/** Home snapshot info row */
function HomeInfoBlock({ label, value, hint, icon, accent = PALETTE.blue, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.homeBlock,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.homeBlockIcon, { backgroundColor: PALETTE.blueSoft }]}>
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <View style={styles.homeBlockContent}>
        <Text style={styles.homeBlockLabel}>{label}</Text>
        <Text style={styles.homeBlockValue} numberOfLines={1}>{value}</Text>
        {hint ? <Text style={styles.homeBlockHint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={17} color={PALETTE.inkTertiary} />
    </Pressable>
  );
}

/** Empty state */
function EmptyState({ icon, title, body }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
        <MaterialCommunityIcons name={icon} size={24} color={PALETTE.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

/** Flat-picker bottom-sheet modal */
function FlatPicker({ visible, flatOptions, selectedFlat, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Choose home</Text>
          <Text style={styles.modalSubtitle}>Switch dashboard to another flat.</Text>
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
                      backgroundColor: active ? PALETTE.blueSoft : PALETTE.surfaceMuted,
                      borderColor: active ? PALETTE.blue : PALETTE.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={[styles.flatOptionIcon, { backgroundColor: active ? PALETTE.blueMid : PALETTE.border }]}>
                    <MaterialCommunityIcons
                      name="home-city-outline"
                      size={18}
                      color={active ? PALETTE.blue : PALETTE.inkSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.flatOptionTitle, { color: active ? PALETTE.blue : PALETTE.ink }]}>
                      {item.block} · {item.flat}
                    </Text>
                    <Text style={styles.flatOptionMeta}>Tap to switch</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={PALETTE.blue} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, token, getRegistrationRequests } = useAuth();
  const insets = useSafeAreaInsets();
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
      { title: 'Pay Maintenance',      subtitle: 'UPI & QR details',          icon: 'qrcode-scan',                    tone: 'blue',   onPress: () => navigation.navigate('PaymentInfo')   },
      { title: 'Payment History',      subtitle: 'Receipts & timeline',        icon: 'receipt-text-outline',           tone: 'green',  onPress: () => navigation.navigate('PaymentsList')  },
      { title: 'Fund Ledger',          subtitle: 'Ledger & accounts',          icon: 'book-open-page-variant-outline', tone: 'indigo', onPress: () => navigation.navigate('PaymentsHub')   },
      { title: 'Notices',              subtitle: 'Announcements',              icon: 'bell-outline',                   tone: 'amber',  onPress: () => navigation.navigate('Notices')       },
      { title: 'Complaints',           subtitle: 'Raise or track issues',      icon: 'message-alert-outline',          tone: 'red',    onPress: () => navigation.navigate('Complaints')    },
      { title: 'Residents Directory',  subtitle: 'People & homes',             icon: 'account-group-outline',          tone: 'slate',  onPress: () => navigation.navigate('Directory')     },
    ];

    if (isAdmin) return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo', onPress: () => navigation.navigate('ExpensesList')          },
      { title: 'Pending Requests',     subtitle: pendingCount > 0 ? `${pendingCount} awaiting` : 'Approvals', icon: 'account-clock-outline', tone: 'red', onPress: () => navigation.navigate('AdminRegistrationRequests') },
      { title: 'Add Payment',          subtitle: 'Record a payment',           icon: 'cash-plus',                      tone: 'green',  onPress: () => navigation.navigate('NewPayment')            },
      { title: 'Add Expense',          subtitle: 'Log an expense',             icon: 'receipt-text-plus-outline',      tone: 'amber',  onPress: () => navigation.navigate('NewExpense')            },
    ];

    if (isOwner) return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo', onPress: () => navigation.navigate('ExpensesList')          },
    ];

    return [
      ...base,
      { title: 'Expenses',             subtitle: 'Society spend',              icon: 'cash-minus',                     tone: 'indigo', onPress: () => navigation.navigate('ExpensesList')          },
      { title: 'Owner Details',        subtitle: 'Your landlord info',         icon: 'home-city-outline',              tone: 'blue',
        onPress: () => activeOwner?.property_id
          ? navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })
          : Alert.alert('Info', 'No owner details available yet.'),
      },
    ];
  }, [activeOwner?.property_id, flatOptions.length, isAdmin, isOwner, navigation, pendingCount]);

  // ─── Activity feed ─────────────────────────────────────────────────────────

  const recentPayments = (dashboard?.recent_payments || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check',
    title: 'Payment received',
    subtitle: `${item.block} ${item.flat} · ${fmtAmount(item.amount)} · ${item.mode || 'UPI'}`,
    time: formatRelativeTime(item.date),
  }));

  const personalPayments = (personalSummary?.entries || []).slice(0, 3).map((item) => ({
    kind: 'payment', icon: 'cash-check',
    title: 'Your payment',
    subtitle: `${fmtAmount(item.amount)} · ${item.mode_of_payment || 'Payment'}`,
    time: formatRelativeTime(item.payment_date || item.date),
  }));

  const noticeActivity = notices.slice(0, 2).map((item) => ({
    kind: 'notice', icon: 'bell-ring-outline',
    title: item.title,
    subtitle: truncate(item.body, 80),
    time: formatRelativeTime(item.published_at || item.created_at),
  }));

  const complaintActivity = complaints.slice(0, 2).map((item) => ({
    kind: 'complaint', icon: 'message-alert-outline',
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
      style={[styles.root, { backgroundColor: PALETTE.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 56 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={PALETTE.blue}
          colors={[PALETTE.blue]}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerGreeting}>{greeting},</Text>
          <Text style={styles.headerName}>{displayName}</Text>
          {societyName ? (
            <Text style={styles.headerMeta} numberOfLines={1}>{societyName}</Text>
          ) : null}
        </View>
      </View>

      {/* ── Flat switcher pill — owners with ≥1 flat ───────────────────────── */}
      {isOwner && flatOptions.length > 0 && (
        <Pressable
          onPress={() => flatOptions.length > 1 && setFlatPickerOpen(true)}
          style={({ pressed }) => [
            styles.flatSwitcherPill,
            flatOptions.length > 1 && pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.flatSwitcherIconWrap}>
            <MaterialCommunityIcons name="home-city-outline" size={15} color={PALETTE.blue} />
          </View>
          <Text style={styles.flatSwitcherLabel} numberOfLines={1}>
            {selectedFlat ? `${selectedFlat.block} · Flat ${selectedFlat.flat}` : 'Select flat'}
          </Text>
          {flatOptions.length > 1 && (
            <>
              <View style={styles.flatSwitcherDivider} />
              <Text style={styles.flatSwitcherCount}>
                {flatOptions.length} flats
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={PALETTE.blue} />
            </>
          )}
        </Pressable>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <ActionCard key={item.title} {...item} />
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
              <NoticeCard
                key={String(item.id)}
                item={{
                  title: item.title,
                  body: item.body,
                  category: item.category || 'GENERAL',
                  time: formatRelativeTime(item.published_at || item.created_at),
                }}
                onPress={() => navigation.navigate('Notices')}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.card, { paddingVertical: 0 }]}>
            <EmptyState
              icon="bell-outline"
              title="No notices yet"
              body="Community announcements will appear here."
            />
          </View>
        )}
      </View>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Activity"
          actionLabel="View all"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        <View style={styles.card}>
          {activityItems.length > 0 ? (
            activityItems.map((item, idx) => (
              <ActivityRow
                key={`${item.kind}-${idx}`}
                item={item}
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
              body="Payments, notices and updates will appear here."
            />
          )}
        </View>
      </View>

      {/* ── Your Home (Owner / Tenant) ─────────────────────────────────────── */}
      {(isOwner || isTenant) ? (
        <View style={styles.section}>
          <SectionHeader title="Your Home" />
          <View style={styles.card}>
            <HomeInfoBlock
              label="Current flat"
              value={homeLabel || 'Not set'}
              hint={isOwner && flatOptions.length > 1 ? 'Tap to switch flat' : 'Your registered home'}
              icon="home-city-outline"
              accent={PALETTE.blue}
              onPress={() => { if (isOwner && flatOptions.length > 1) setFlatPickerOpen(true); }}
            />
            <View style={styles.homeBlockDivider} />
            <HomeInfoBlock
              label="Owner"
              value={ownerName || 'Available soon'}
              hint={isTenant ? 'Tenant reference view' : 'Owner on record'}
              icon="account-tie-outline"
              accent={PALETTE.indigo}
              onPress={() =>
                activeOwner?.property_id
                  ? navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })
                  : undefined
              }
            />
          </View>
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
    color: PALETTE.inkSecondary,
    letterSpacing: 0.1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.6,
  },
  headerMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: PALETTE.inkTertiary,
    letterSpacing: 0,
  },

  // ── Flat switcher pill ────────────────────────────────────────────────────
  flatSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 14,
    backgroundColor: PALETTE.blueSoft,
    borderWidth: 1,
    borderColor: PALETTE.blueMid,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      ios:     { shadowColor: PALETTE.blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  flatSwitcherIconWrap: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.xs,
    backgroundColor: PALETTE.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatSwitcherLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.blue,
    letterSpacing: -0.1,
    maxWidth: 180,
  },
  flatSwitcherDivider: {
    width: 1,
    height: 14,
    backgroundColor: PALETTE.blueMid,
    marginHorizontal: 1,
  },
  flatSwitcherCount: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.blue,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: PALETTE.blueSoft,
    borderRadius: RADIUS.pill,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Base card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
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
    borderRadius: RADIUS.xl,
    padding: 16,
    minHeight: 132,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    marginTop: 3,
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

  // ── Activity ──────────────────────────────────────────────────────────────
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  activityDivider: {
    height: 1,
    backgroundColor: PALETTE.borderFaint,
    marginHorizontal: 16,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.ink,
    letterSpacing: -0.1,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.inkTertiary,
    flexShrink: 0,
  },
  activitySubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Notice cards ──────────────────────────────────────────────────────────
  noticeStack: {
    gap: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  noticeStripe: {
    width: 4,
  },
  noticeBody: {
    flex: 1,
    padding: 16,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noticeCategoryPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  noticeCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noticeTime: {
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkTertiary,
  },
  noticeTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  noticeExcerpt: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  noticeReadMore: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Home snapshot ─────────────────────────────────────────────────────────
  homeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  homeBlockDivider: {
    height: 1,
    backgroundColor: PALETTE.borderFaint,
    marginHorizontal: 16,
  },
  homeBlockIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  homeBlockContent: {
    flex: 1,
    minWidth: 0,
  },
  homeBlockLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  homeBlockValue: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  homeBlockHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
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

  // ── Flat picker modal ─────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: PALETTE.overlay,
    padding: 12,
  },
  modalSheet: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 20,
    maxHeight: '72%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    textAlign: 'center',
  },
  flatOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  flatOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
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
    color: PALETTE.inkSecondary,
  },
});