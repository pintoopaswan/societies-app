import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { shadow, typography, useAppTheme } from '../lib/theme';

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

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={[styles.sectionAction, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <Text style={[styles.sectionActionText, { color: colors.text }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function FilterChip({ label, active, onPress, count }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? colors.primaryBlue : colors.surfaceSoft,
          borderColor: active ? colors.primaryBlue : colors.border,
        },
      ]}
    >
      <Text style={[styles.filterText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
      {typeof count === 'number' ? <Text style={[styles.filterCount, { color: active ? 'rgba(255,255,255,0.88)' : colors.muted }]}>{count}</Text> : null}
    </TouchableOpacity>
  );
}

function ComplaintCard({ item, isAdmin, onToggleStatus }) {
  const { colors } = useAppTheme();
  const statusTone = item.status === 'RESOLVED'
    ? { bg: 'rgba(22, 163, 74, 0.10)', fg: colors.success }
    : item.status === 'IN_PROGRESS'
      ? { bg: 'rgba(37, 99, 235, 0.10)', fg: colors.primaryBlue }
      : { bg: 'rgba(217, 119, 6, 0.12)', fg: colors.warning };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.block} {item.flat} • {timeAgo(item.created_at || item.updated_at)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: colors.border }]}>
          <Text style={[styles.statusText, { color: statusTone.fg }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={[styles.cardBody, { color: colors.muted }]}>{item.description}</Text>

      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <Text style={[styles.metaChipText, { color: colors.text }]}>{item.priority || 'NORMAL'}</Text>
        </View>
        <Text style={[styles.assignedText, { color: colors.muted }]}>
          {item.assigned_to ? `Assigned to ${item.assigned_to}` : 'Not assigned'}
        </Text>
      </View>

      {isAdmin ? (
        <TouchableOpacity
          onPress={onToggleStatus}
          style={[styles.resolveButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="progress-check" size={18} color={colors.primaryBlue} />
          <Text style={[styles.resolveButtonText, { color: colors.text }]}>{item.status === 'RESOLVED' ? 'Reopen complaint' : 'Resolve complaint'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ComplaintsScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const { colors } = useAppTheme();
  const [complaints, setComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const loadComplaints = useCallback(async () => {
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

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints]),
  );

  const updateStatus = async (complaintId, nextStatus) => {
    try {
      await apiRequest(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      }, token);
      loadComplaints();
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to update complaint.');
    }
  };

  const filters = useMemo(() => {
    const all = complaints.length;
    const open = complaints.filter((item) => item.status === 'OPEN').length;
    const inProgress = complaints.filter((item) => item.status === 'IN_PROGRESS').length;
    const resolved = complaints.filter((item) => item.status === 'RESOLVED').length;
    return [
      { id: 'ALL', label: 'All', count: all },
      { id: 'OPEN', label: 'Open', count: open },
      { id: 'IN_PROGRESS', label: 'In progress', count: inProgress },
      { id: 'RESOLVED', label: 'Resolved', count: resolved },
    ];
  }, [complaints]);

  const visibleComplaints = useMemo(() => {
    if (filter === 'ALL') return complaints;
    return complaints.filter((item) => item.status === filter);
  }, [complaints, filter]);

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadComplaints} tintColor={colors.primaryBlue} />}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroKicker, { color: colors.muted }]}>COMPLAINTS</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Track issues in a clear, calm, and premium workspace</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Keep complaints readable for residents while giving admins a clean workflow for follow-up.
            </Text>
          </View>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: colors.primaryBlue }]} onPress={() => navigation.navigate('NewComplaint')}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroStats}>
          <View style={[styles.heroStat, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Open</Text>
            <Text style={[styles.heroStatValue, { color: colors.text }]}>{filters.find((x) => x.id === 'OPEN')?.count || 0}</Text>
          </View>
          <View style={[styles.heroStat, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Active</Text>
            <Text style={[styles.heroStatValue, { color: colors.text }]}>{filters.find((x) => x.id === 'IN_PROGRESS')?.count || 0}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Status Filters"
          subtitle="A quick, thumb-friendly way to narrow the list."
          actionLabel="New complaint"
          onAction={() => navigation.navigate('NewComplaint')}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((item) => (
            <FilterChip
              key={item.id}
              label={item.label}
              count={item.count}
              active={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Complaint List"
          subtitle="Cards are laid out for fast scanning and simple admin actions."
        />
        {visibleComplaints.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="ticket-outline" size={28} color={colors.primaryBlue} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No complaints found</Text>
            <Text style={[styles.emptyCopy, { color: colors.muted }]}>Try another status filter or create a new complaint.</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {visibleComplaints.map((item) => (
              <ComplaintCard
                key={String(item.id)}
                item={item}
                isAdmin={isAdmin}
                onToggleStatus={() => updateStatus(item.id, item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')}
              />
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroGlowA: {
    position: 'absolute',
    top: -26,
    right: -18,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37, 99, 235, 0.07)',
  },
  heroGlowB: {
    position: 'absolute',
    bottom: -36,
    left: -24,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    fontFamily: typography.heading,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  heroButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontFamily: typography.heading,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionAction: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  filterRow: {
    gap: 10,
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  stack: {
    gap: 10,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  assignedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
  resolveButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resolveButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
});
