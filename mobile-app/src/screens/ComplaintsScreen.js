import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';

// ─── Utility ─────────────────────────────────────────────────────────────────

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

// ─── Design tokens — identical to PaymentsHubScreen ──────────────────────────

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  OPEN:        { label: 'Open',        fg: P.amber,   bg: P.amberSoft,   ring: P.amberMid,   icon: 'alert-circle-outline'   },
  IN_PROGRESS: { label: 'In Progress', fg: P.brand,   bg: P.brandSoft,   ring: P.brandMid,   icon: 'progress-clock'         },
  RESOLVED:    { label: 'Resolved',    fg: P.emerald, bg: P.emeraldSoft, ring: P.emeraldMid, icon: 'check-circle-outline'   },
};

const PRIORITY = {
  HIGH:   { fg: P.rose,   bg: P.roseSoft   },
  NORMAL: { fg: P.slate,  bg: P.slateSoft  },
  LOW:    { fg: P.emerald,bg: P.emeraldSoft },
};

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

function StatCell({ label, value, accent }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
      ]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
      {typeof count === 'number' && (
        <View style={[styles.filterChipBadge, active && styles.filterChipBadgeActive]}>
          <Text style={[styles.filterChipBadgeText, active && styles.filterChipBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── ComplaintCard ────────────────────────────────────────────────────────────

function ComplaintCard({ item, isAdmin, onToggleStatus, isLast }) {
  const s = STATUS[item.status] || STATUS.OPEN;
  const p = PRIORITY[item.priority] || PRIORITY.NORMAL;

  return (
    <View style={[styles.complaintCard, !isLast && styles.cardDivider]}>

      {/* Top row: title + status pill */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.block} {item.flat} · {timeAgo(item.created_at || item.updated_at)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: s.bg, borderColor: s.ring }]}>
          <MaterialCommunityIcons name={s.icon} size={11} color={s.fg} />
          <Text style={[styles.statusPillText, { color: s.fg }]}>{s.label}</Text>
        </View>
      </View>

      {/* Description */}
      {!!item.description && (
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
      )}

      {/* Footer row: priority + assigned */}
      <View style={styles.cardFootRow}>
        <View style={[styles.priorityBadge, { backgroundColor: p.bg }]}>
          <Text style={[styles.priorityText, { color: p.fg }]}>
            {item.priority || 'NORMAL'}
          </Text>
        </View>
        <Text style={styles.assignedText} numberOfLines={1}>
          {item.assigned_to ? `→ ${item.assigned_to}` : 'Unassigned'}
        </Text>
      </View>

      {/* Admin action */}
      {isAdmin && (
        <Pressable
          onPress={onToggleStatus}
          style={({ pressed }) => [
            styles.actionBtn,
            item.status === 'RESOLVED' ? styles.actionBtnReopen : styles.actionBtnResolve,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name={item.status === 'RESOLVED' ? 'refresh' : 'check-circle-outline'}
            size={15}
            color={item.status === 'RESOLVED' ? P.amber : P.emerald}
          />
          <Text style={[
            styles.actionBtnText,
            { color: item.status === 'RESOLVED' ? P.amber : P.emerald },
          ]}>
            {item.status === 'RESOLVED' ? 'Reopen' : 'Mark resolved'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── EmptyCard ────────────────────────────────────────────────────────────────

function EmptyCard({ filter }) {
  const isEmpty = filter === 'ALL';
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons
          name={isEmpty ? 'ticket-outline' : 'filter-off-outline'}
          size={22}
          color={P.brand}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {isEmpty ? 'No complaints yet' : 'Nothing here'}
      </Text>
      <Text style={styles.emptyBody}>
        {isEmpty
          ? 'All quiet — no complaints have been raised.'
          : 'No complaints match this filter.'}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ComplaintsScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const insets = useSafeAreaInsets();

  const [complaints, setComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/complaints', {}, token);
      setComplaints(res.data || []);
    } catch {
      setComplaints([]);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateStatus = async (id, nextStatus) => {
    try {
      await apiRequest(`/api/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      }, token);
      load();
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to update complaint.');
    }
  };

  const counts = useMemo(() => ({
    ALL:         complaints.length,
    OPEN:        complaints.filter((c) => c.status === 'OPEN').length,
    IN_PROGRESS: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
    RESOLVED:    complaints.filter((c) => c.status === 'RESOLVED').length,
  }), [complaints]);

  const FILTERS = [
    { id: 'ALL',         label: 'All'         },
    { id: 'OPEN',        label: 'Open'        },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'RESOLVED',    label: 'Resolved'    },
  ];

  const visible = useMemo(
    () => filter === 'ALL' ? complaints : complaints.filter((c) => c.status === filter),
    [complaints, filter],
  );

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
          <Text style={styles.headerEyebrow}>Support</Text>
          <Text style={styles.headerTitle}>Complaints</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('NewComplaint')}
          style={({ pressed }) => [styles.newBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <View style={styles.statsStrip}>
        <StatCell label="OPEN"     value={counts.OPEN}        accent={P.amber}   />
        <View style={styles.statsDivider} />
        <StatCell label="ACTIVE"   value={counts.IN_PROGRESS} accent={P.brand}   />
        <View style={styles.statsDivider} />
        <StatCell label="RESOLVED" value={counts.RESOLVED}    accent={P.emerald} />
      </View>

      {/* ── Filter chips ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel
          title="Filter by Status"
          actionLabel="New complaint"
          onAction={() => navigation.navigate('NewComplaint')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              count={counts[f.id]}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Complaint list ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Complaints" />
        {visible.length === 0 ? (
          <EmptyCard filter={filter} />
        ) : (
          <View style={styles.card}>
            {visible.map((item, idx) => (
              <ComplaintCard
                key={String(item.id)}
                item={item}
                isAdmin={isAdmin}
                isLast={idx === visible.length - 1}
                onToggleStatus={() =>
                  updateStatus(item.id, item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')
                }
              />
            ))}
          </View>
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
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_MD,
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

  // ── Filter chips ─────────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    ...SHADOW_SM,
  },
  filterChipActive: {
    backgroundColor: P.brand,
    borderColor: P.brand,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.inkSub,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: P.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.inkSub,
  },
  filterChipBadgeTextActive: {
    color: '#FFFFFF',
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
  cardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderSubtle,
  },

  // ── Complaint card (row inside grouped card) ─────────────────────────────────
  complaintCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: P.inkMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: P.inkSub,
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  assignedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: P.inkMuted,
    textAlign: 'right',
  },

  // ── Admin action button ──────────────────────────────────────────────────────
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  actionBtnResolve: {
    backgroundColor: P.emeraldSoft,
    borderColor: P.emeraldMid,
  },
  actionBtnReopen: {
    backgroundColor: P.amberSoft,
    borderColor: P.amberMid,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
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




