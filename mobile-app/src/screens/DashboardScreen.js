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
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { colors as themeColors, shadow, typography, useAppTheme } from '../lib/theme';

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
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F3F4F6',

  // Text
  ink: '#0F0F10',
  inkSecondary: '#6B7280',
  inkTertiary: '#9CA3AF',

  // Accents
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

  // Borders
  border: '#E5E7EB',
  borderSoft: '#F3F4F6',

  // Overlay
  overlay: 'rgba(0,0,0,0.45)',
};

const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
};

const ACTION_PALETTE = {
  blue:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue,    ring: PALETTE.blueMid },
  indigo: { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo,  ring: '#C7D2FE' },
  green:  { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald, ring: '#A7F3D0' },
  amber:  { bg: PALETTE.amberSoft,   fg: PALETTE.amber,   ring: '#FDE68A' },
  red:    { bg: PALETTE.roseSoft,    fg: PALETTE.rose,    ring: '#FECDD3' },
  slate:  { bg: PALETTE.slateSoft,   fg: PALETTE.slate,   ring: '#CBD5E1' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Avatar — photo or initial, with subtle ring */
function Avatar({ user, size = 52 }) {
  const initial = String(user?.name || 'U').trim().charAt(0).toUpperCase();
  const hasPhoto = Boolean(user?.photo_url);

  return (
    <View
      style={[
        styles.avatarRing,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
      ]}
    >
      <View
        style={[
          styles.avatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {hasPhoto ? (
          <Image
            source={{ uri: user.photo_url }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <Text style={[styles.avatarInitial, { fontSize: Math.round(size * 0.4) }]}>
            {initial}
          </Text>
        )}
      </View>
    </View>
  );
}

/** Pill badge */
function Pill({ label, color = PALETTE.blue, bg = PALETTE.blueSoft, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={11} color={color} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Section header with optional "See all" action */
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

/** 2-column quick-action card */
function ActionCard({ title, subtitle, icon, tone = 'blue', onPress }) {
  const p = ACTION_PALETTE[tone] || ACTION_PALETTE.blue;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {/* top accent bar */}
      <View style={[styles.actionAccentBar, { backgroundColor: p.fg, opacity: 0.12 }]} />

      <View style={[styles.actionIconWrap, { backgroundColor: p.bg, borderColor: p.ring }]}>
        <MaterialCommunityIcons name={icon} size={22} color={p.fg} />
      </View>
      <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>

      {/* subtle chevron */}
      <View style={styles.actionChevronWrap}>
        <MaterialCommunityIcons name="arrow-right" size={14} color={p.fg} />
      </View>
    </Pressable>
  );
}

/** Horizontal shortcut chip */
function ShortcutChip({ title, icon, tone = 'default', onPress }) {
  const map = {
    default: { bg: PALETTE.slateSoft,   fg: PALETTE.slate },
    primary: { bg: PALETTE.blueSoft,    fg: PALETTE.blue },
    accent:  { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo },
    success: { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
    warning: { bg: PALETTE.amberSoft,   fg: PALETTE.amber },
    danger:  { bg: PALETTE.roseSoft,    fg: PALETTE.rose },
  };
  const p = map[tone] || map.default;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcutChip,
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={[styles.shortcutIconWrap, { backgroundColor: p.bg }]}>
        <MaterialCommunityIcons name={icon} size={17} color={p.fg} />
      </View>
      <Text style={styles.shortcutTitle}>{title}</Text>
    </Pressable>
  );
}

/** Activity feed row — timeline style */
function ActivityRow({ item, onPress, isLast }) {
  const toneMap = {
    payment:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
    notice:    { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
    complaint: { bg: PALETTE.roseSoft,    fg: PALETTE.rose    },
    update:    { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
  };
  const t = toneMap[item.kind] || { bg: PALETTE.slateSoft, fg: PALETTE.slate };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityRow,
        { opacity: pressed ? 0.88 : 1 },
      ]}
    >
      {/* left timeline dot + line */}
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: t.fg }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* icon */}
      <View style={[styles.activityIcon, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={item.icon} size={16} color={t.fg} />
      </View>

      {/* content */}
      <View style={styles.activityContent}>
        <View style={styles.activityTitleRow}>
          <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.activityTime}>{item.time}</Text>
        </View>
        <Text style={styles.activitySubtitle} numberOfLines={2}>{item.subtitle}</Text>
        {item.meta ? (
          <View style={[styles.activityBadge, { backgroundColor: t.bg }]}>
            <Text style={[styles.activityBadgeText, { color: t.fg }]}>{item.meta}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Notice announcement card */
function NoticeCard({ item, onPress }) {
  const categoryColors = {
    GENERAL:     { bg: PALETTE.slateSoft,   fg: PALETTE.slate },
    MAINTENANCE: { bg: PALETTE.amberSoft,   fg: PALETTE.amber },
    EMERGENCY:   { bg: PALETTE.roseSoft,    fg: PALETTE.rose  },
    EVENT:       { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
    FINANCE:     { bg: PALETTE.blueSoft,    fg: PALETTE.blue  },
  };
  const cat = String(item.category || 'GENERAL').toUpperCase();
  const c = categoryColors[cat] || categoryColors.GENERAL;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noticeCard,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      {/* left accent stripe */}
      <View style={[styles.noticeStripe, { backgroundColor: c.fg }]} />

      <View style={styles.noticeBody}>
        <View style={styles.noticeTopRow}>
          <View style={[styles.noticeCategoryPill, { backgroundColor: c.bg }]}>
            <Text style={[styles.noticeCategoryText, { color: c.fg }]}>{cat}</Text>
          </View>
          <Text style={styles.noticeTime}>{item.time}</Text>
        </View>
        <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.noticeExcerpt} numberOfLines={3}>{item.body}</Text>
        <View style={styles.noticeFooter}>
          <Text style={styles.noticeReadMore}>Read more</Text>
          <MaterialCommunityIcons name="arrow-right" size={14} color={PALETTE.blue} />
        </View>
      </View>
    </Pressable>
  );
}

/** Home snapshot info block */
function HomeInfoBlock({ label, value, hint, icon, accent = PALETTE.blue, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.homeBlock,
        { opacity: pressed ? 0.9 : 1 },
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
      <MaterialCommunityIcons name="chevron-right" size={18} color={PALETTE.inkTertiary} />
    </Pressable>
  );
}

/** Empty state */
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

/** Flat-picker bottom-sheet modal */
function FlatPicker({ visible, flatOptions, selectedFlat, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          {/* drag handle */}
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>Choose home</Text>
          <Text style={styles.modalSubtitle}>Switch the dashboard focus to another flat.</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 20 }}
            contentContainerStyle={{ gap: 10 }}
          >
            {flatOptions.map((item) => {
              const active =
                selectedFlat?.block === item.block && selectedFlat?.flat === item.flat;
              return (
                <Pressable
                  key={`${item.block}-${item.flat}`}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [
                    styles.flatOptionRow,
                    {
                      backgroundColor: active ? PALETTE.blueSoft : PALETTE.surfaceMuted,
                      borderColor: active ? PALETTE.blue : PALETTE.border,
                      opacity: pressed ? 0.9 : 1,
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
  const displayName = (user?.name || 'there').split(' ')[0]; // first name only
  const roleLabel = role || 'RESIDENT';

  const homeLabel = useMemo(() => {
    if (selectedFlat?.block && selectedFlat?.flat) return `${selectedFlat.block} · ${selectedFlat.flat}`;
    if (user?.block && user?.flat) return `${user.block} · ${user.flat}`;
    return 'Home dashboard';
  }, [selectedFlat?.block, selectedFlat?.flat, user?.block, user?.flat]);

  const ownerName = activeOwner?.owner_name || '';

  // ─── Quick actions ────────────────────────────────────────────────────────

  const quickActions = useMemo(() => [
    { title: 'Pay Maintenance',     subtitle: 'UPI & QR payment details',   icon: 'qrcode-scan',                   tone: 'blue',   onPress: () => navigation.navigate('PaymentInfo') },
    { title: 'Payment History',     subtitle: 'Receipts and timeline',       icon: 'receipt-text-outline',          tone: 'green',  onPress: () => navigation.navigate('PaymentsList') },
    { title: 'Fund Ledger',         subtitle: 'Ledger and account view',     icon: 'book-open-page-variant-outline', tone: 'indigo', onPress: () => navigation.navigate('PaymentsHub') },
    { title: 'Notices',             subtitle: 'Community announcements',     icon: 'bell-outline',                  tone: 'amber',  onPress: () => navigation.navigate('Notices') },
    { title: 'Complaints',          subtitle: 'Raise or track issues',       icon: 'message-alert-outline',         tone: 'red',    onPress: () => navigation.navigate('Complaints') },
    { title: 'Residents Directory', subtitle: 'People and homes',            icon: 'account-group-outline',         tone: 'slate',  onPress: () => navigation.navigate('Directory') },
    { title: 'Expenses',            subtitle: 'Society spend overview',      icon: 'cash-minus',                    tone: 'indigo', onPress: () => navigation.navigate('ExpensesList') },
    { title: 'My Profile',          subtitle: 'Account & settings',          icon: 'account-circle-outline',        tone: 'blue',   onPress: () => navigation.navigate('Profile') },
  ], [navigation]);

  // ─── Shortcuts ────────────────────────────────────────────────────────────

  const shortcuts = useMemo(() => {
    const base = [
      { title: 'Search',       icon: 'magnify',             tone: 'primary',  onPress: () => navigation.navigate('DashboardSearch') },
      { title: 'Payment Info', icon: 'qrcode',              tone: 'success',  onPress: () => navigation.navigate('PaymentInfo') },
      { title: 'Helpdesk',     icon: 'lifebuoy',            tone: 'warning',  onPress: () => navigation.navigate('Helpdesk') },
      { title: 'Security',     icon: 'shield-home-outline', tone: 'accent',   onPress: () => navigation.navigate('Security') },
    ];
    if (isAdmin) return [
      ...base,
      { title: 'Requests',    icon: 'account-clock-outline',       tone: 'danger',  onPress: () => navigation.navigate('AdminRegistrationRequests') },
      { title: 'Add Payment', icon: 'cash-plus',                    tone: 'primary', onPress: () => navigation.navigate('NewPayment') },
      { title: 'Add Expense', icon: 'receipt-text-plus-outline',    tone: 'warning', onPress: () => navigation.navigate('NewExpense') },
      { title: 'Add Resident',icon: 'account-plus-outline',         tone: 'accent',  onPress: () => navigation.navigate('AddOwner') },
    ];
    if (isOwner) return [
      ...base,
      { title: 'My Flats',      icon: 'home-city-outline',           tone: 'accent',  onPress: () => setFlatPickerOpen(true) },
      { title: 'Tenant Details',icon: 'card-account-details-outline',tone: 'primary', onPress: () => navigation.navigate('Directory') },
    ];
    return [
      ...base,
      { title: 'Owner Details', icon: 'home-city-outline', tone: 'accent',
        onPress: () => activeOwner?.property_id
          ? navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })
          : Alert.alert('Info', 'No owner details available yet.'),
      },
    ];
  }, [activeOwner?.property_id, isAdmin, isOwner, navigation]);

  // ─── Activity feed ─────────────────────────────────────────────────────────

  const recentPayments = (dashboard?.recent_payments || []).slice(0, 4).map((item) => ({
    kind: 'payment', icon: 'cash-check',
    title: 'Payment received',
    subtitle: `${item.block} ${item.flat} · ${fmtAmount(item.amount)}`,
    meta: item.mode || 'UPI',
    time: formatRelativeTime(item.date),
  }));

  const personalPayments = (personalSummary?.entries || []).slice(0, 4).map((item) => ({
    kind: 'payment', icon: 'cash-check',
    title: 'Your payment',
    subtitle: `${fmtAmount(item.amount)} · ${item.mode_of_payment || 'Payment'}`,
    meta: `${item.month || ''}/${item.year || ''}`.replace(/^\/|\/$/g, '') || 'Receipt',
    time: formatRelativeTime(item.payment_date || item.date),
  }));

  const noticeActivity = notices.slice(0, 2).map((item) => ({
    kind: 'notice', icon: 'bell-ring-outline',
    title: item.title,
    subtitle: truncate(item.body, 100),
    meta: item.category || 'Notice',
    time: formatRelativeTime(item.published_at || item.created_at),
  }));

  const complaintActivity = complaints.slice(0, 2).map((item) => ({
    kind: 'complaint', icon: 'message-alert-outline',
    title: item.title,
    subtitle: truncate(item.description, 100),
    meta: item.status || 'Open',
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
    <Page
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={PALETTE.blue}
        />
      }
      style={{ backgroundColor: PALETTE.bg }}
    >

      {/* ── Hero / Welcome ─────────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        {/* decorative mesh blobs */}
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        {/* top row: greeting + avatar */}
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            {/* role + live pill row */}
            <View style={styles.heroPillsRow}>
              <Pill
                label={roleLabel}
                color={PALETTE.indigo}
                bg={PALETTE.indigoSoft}
              />
              <Pill
                label="Live"
                color={PALETTE.emerald}
                bg={PALETTE.emeraldSoft}
                icon="circle-medium"
              />
            </View>

            <Text style={styles.heroGreeting}>
              {greeting},{'\n'}{displayName} 👋
            </Text>

            <Text style={styles.heroSubtitle}>
              {isAdmin
                ? 'Manage your society from one calm, powerful hub.'
                : 'Your home hub, designed for effortless daily access.'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Avatar user={user} size={54} />
          </TouchableOpacity>
        </View>

        {/* identity cards row */}
        <View style={styles.identityRow}>
          {/* Home / flat card */}
          <Pressable
            onPress={() => { if (isOwner && flatOptions.length > 1) setFlatPickerOpen(true); }}
            style={({ pressed }) => [
              styles.identityCard,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="home-variant-outline" size={16} color={PALETTE.blue} />
            <Text style={styles.identityCardLabel}>Home</Text>
            <Text style={styles.identityCardValue} numberOfLines={1}>{homeLabel}</Text>
            {isOwner && flatOptions.length > 1 && (
              <Text style={styles.identityCardHint}>Tap to switch</Text>
            )}
            {isAdmin && pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Role / date card */}
          <View style={styles.identityCard}>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color={PALETTE.indigo} />
            <Text style={styles.identityCardLabel}>Role</Text>
            <Text style={styles.identityCardValue} numberOfLines={1}>{roleLabel}</Text>
            <Text style={styles.identityCardHint} numberOfLines={1}>
              {dashboard?.today || 'Updated live'}
            </Text>
          </View>
        </View>

        {/* search bar */}
        <Pressable
          onPress={() => navigation.navigate('DashboardSearch')}
          style={({ pressed }) => [
            styles.searchBar,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={styles.searchIconWrap}>
            <MaterialCommunityIcons name="magnify" size={19} color={PALETTE.blue} />
          </View>
          <Text style={styles.searchPlaceholder}>
            Search payments, residents, notices…
          </Text>
          <View style={styles.searchKbd}>
            <Text style={styles.searchKbdText}>⌘K</Text>
          </View>
        </Pressable>
      </View>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <ActionCard key={item.title} {...item} />
          ))}
        </View>
      </View>

      {/* ── Shortcuts ─────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Shortcuts" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsRow}
        >
          {shortcuts.map((item) => (
            <ShortcutChip key={item.title} {...item} />
          ))}
        </ScrollView>
      </View>

      {/* ── Recent Activity ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Activity"
          actionLabel="View all"
          onAction={() => navigation.navigate('PaymentsList')}
        />
        <View style={styles.activityCard}>
          {activityItems.length > 0 ? (
            activityItems.map((item, idx) => (
              <ActivityRow
                key={`${item.kind}-${idx}`}
                item={item}
                isLast={idx === activityItems.length - 1}
                onPress={() => {
                  if (item.kind === 'payment') return navigation.navigate('PaymentsList');
                  if (item.kind === 'notice') return navigation.navigate('Notices');
                  if (item.kind === 'complaint') return navigation.navigate('Complaints');
                }}
              />
            ))
          ) : (
            <EmptyState
              icon="progress-clock"
              title="No recent activity"
              body="Payments, notices, and updates will appear here."
            />
          )}
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
          <EmptyState
            icon="bell-outline"
            title="No notices yet"
            body="Community announcements will appear here when published."
          />
        )}
      </View>

      {/* ── Home Snapshot (Owner / Tenant) ─────────────────────────────────── */}
      {(isOwner || isTenant) ? (
        <View style={styles.section}>
          <SectionHeader title="Your Home" />
          <View style={styles.homeSnapshotCard}>
            <HomeInfoBlock
              label="Current flat"
              value={homeLabel}
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

      {/* ── Bottom spacer ─────────────────────────────────────────────────── */}
      <View style={{ height: 40 }} />

      {/* ── Flat picker ───────────────────────────────────────────────────── */}
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
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarRing: {
    padding: 3,
    backgroundColor: PALETTE.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    overflow: 'hidden',
    backgroundColor: PALETTE.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.5,
  },

  // ── Pill ─────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 20,
    marginBottom: 8,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(79, 70, 229, 0.07)',
  },
  blobB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroGreeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.7,
    fontFamily: typography?.display || undefined,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Identity cards ────────────────────────────────────────────────────────
  identityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  identityCard: {
    flex: 1,
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 3,
  },
  identityCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  identityCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  identityCardHint: {
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  pendingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PALETTE.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: PALETTE.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: PALETTE.inkTertiary,
  },
  searchKbd: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  searchKbdText: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
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
    borderRadius: RADIUS.pill,
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
    borderRadius: RADIUS.xl,
    padding: 16,
    minHeight: 148,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  actionAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
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

  // ── Shortcut chips ────────────────────────────────────────────────────────
  shortcutsRow: {
    gap: 8,
    paddingRight: 4,
  },
  shortcutChip: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.ink,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // ── Activity card ─────────────────────────────────────────────────────────
  activityCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 10,
  },
  timelineLeft: {
    width: 16,
    alignItems: 'center',
    paddingTop: 6,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: PALETTE.border,
    marginTop: 4,
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
    paddingTop: 1,
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
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  noticeStripe: {
    width: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
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
    paddingVertical: 4,
  },
  noticeCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noticeTime: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.inkTertiary,
  },
  noticeTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  noticeExcerpt: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  noticeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  noticeReadMore: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Home snapshot ─────────────────────────────────────────────────────────
  homeSnapshotCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  homeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  homeBlockDivider: {
    height: 1,
    backgroundColor: PALETTE.borderSoft,
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
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  homeBlockValue: {
    fontSize: 15,
    fontWeight: '800',
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
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
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
    fontSize: 20,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
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
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  flatOptionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
});