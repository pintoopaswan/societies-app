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
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

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

const STATUS = {
  OPEN:        { label: 'Open',        tone: 'warning', icon: 'alert-circle-outline' },
  IN_PROGRESS: { label: 'In Progress', tone: 'info',    icon: 'progress-clock'       },
  RESOLVED:    { label: 'Resolved',    tone: 'success', icon: 'check-circle-outline' },
};

const PRIORITY = {
  HIGH:   { tone: 'danger'  },
  NORMAL: { tone: 'neutral' },
  LOW:    { tone: 'success' },
};

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onPress }) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border },
        active && { borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.text }]}>
        {label}
      </Text>
      {typeof count === 'number' && (
        <View style={[styles.filterChipBadge, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : colors.surfaceSoft }]}>
          <Text style={[styles.filterChipBadgeText, { color: active ? '#fff' : colors.muted }]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── ComplaintCard ────────────────────────────────────────────────────────────

function ComplaintCard({ item, isAdmin, onToggleStatus, isLast }) {
  const { colors } = useAppTheme();
  const s = STATUS[item.status] || STATUS.OPEN;
  const p = PRIORITY[item.priority] || PRIORITY.NORMAL;

  return (
    <View style={[styles.complaintCard, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>

      {/* Top row: title + status pill */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {item.block} {item.flat} · {timeAgo(item.created_at || item.updated_at)}
          </Text>
        </View>
        <Badge label={s.label} tone={s.tone} />
      </View>

      {/* Description */}
      {!!item.description && (
        <Text style={[styles.cardDesc, { color: colors.muted }]} numberOfLines={3}>{item.description}</Text>
      )}

      {/* Footer row: priority + assigned */}
      <View style={styles.cardFootRow}>
        <Badge label={item.priority || 'NORMAL'} tone={p.tone} />
        <Text style={[styles.assignedText, { color: colors.muted }]} numberOfLines={1}>
          {item.assigned_to ? `→ ${item.assigned_to}` : 'Unassigned'}
        </Text>
      </View>

      {/* Admin action */}
      {isAdmin && (
        <Pressable
          onPress={onToggleStatus}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: item.status === 'RESOLVED' ? colors.warning + '15' : colors.success + '15', borderColor: item.status === 'RESOLVED' ? colors.warning + '40' : colors.success + '40' },
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name={item.status === 'RESOLVED' ? 'refresh' : 'check-circle-outline'}
            size={15}
            color={item.status === 'RESOLVED' ? colors.warning : colors.success}
          />
          <Text style={[
            styles.actionBtnText,
            { color: item.status === 'RESOLVED' ? colors.warning : colors.success },
          ]}>
            {item.status === 'RESOLVED' ? 'Reopen' : 'Mark resolved'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ComplaintsScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { colors } = useAppTheme();
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
          <Text style={[styles.headerEyebrow, { color: colors.primaryBlue }]}>Support</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Complaints</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('NewComplaint')}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <Surface style={styles.statsStrip}>
        <StatCell label="OPEN"     value={counts.OPEN}        color={colors.warning}   />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatCell label="ACTIVE"   value={counts.IN_PROGRESS} color={colors.primaryBlue}   />
        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
        <StatCell label="RESOLVED" value={counts.RESOLVED}    color={colors.success} />
      </Surface>

      {/* ── Filter chips ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
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
        <SectionHeader title="Complaints" />
        {visible.length === 0 ? (
          <EmptyState
            icon={filter === 'ALL' ? 'ticket-outline' : 'filter-off-outline'}
            title={filter === 'ALL' ? 'No complaints yet' : 'Nothing here'}
            subtitle={filter === 'ALL' ? 'All quiet — no complaints have been raised.' : 'No complaints match this filter.'}
          />
        ) : (
          <Surface style={{ padding: 0 }}>
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
          </Surface>
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
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assignedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
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
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
