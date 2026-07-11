import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
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
import { useAppTheme, typography, radius } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

/** Robust time format helper */
function formatRelativeTime(value) {
  if (!value) return '';
  try {
    // Handle SQLite format YYYY-MM-DD HH:MM:SS by replacing space with T for ISO compatibility
    const date = new Date(String(value).replace(' ', 'T'));
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

const STATUS_MAP = {
  OPEN:        { label: 'Open',        tone: 'warning' },
  IN_PROGRESS: { label: 'Active',      tone: 'info'    },
  RESOLVED:    { label: 'Resolved',    tone: 'success' },
};

/** Complaint Card component */
const ComplaintCard = React.memo(({ item, isAdmin, onAction, isLast }) => {
  const { colors } = useAppTheme();
  const s = STATUS_MAP[item.status] || STATUS_MAP.OPEN;

  return (
    <Surface level={1} style={[styles.card, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleArea}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.onSurfaceVariant }]}>
            {item.block} · {item.flat} · {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        <Badge label={s.label} tone={s.tone} />
      </View>

      {item.description ? (
        <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.footerInfo}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.surfaceContainerHighest }]}>
            <MaterialCommunityIcons name="account" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
            {item.assigned_to || 'Unassigned'}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={onAction}
            style={[styles.actionBtn, { backgroundColor: item.status === 'RESOLVED' ? colors.surfaceContainerHighest : colors.primaryContainer }]}
          >
            <Text style={[styles.actionBtnText, { color: item.status === 'RESOLVED' ? colors.onSurface : colors.onPrimaryContainer }]}>
              {item.status === 'RESOLVED' ? 'Reopen' : 'Mark Resolved'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );
});

export default function ComplaintsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { colors } = useAppTheme();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

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

  const updateStatus = async (id, current) => {
    const next = current === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      await apiRequest(`/api/complaints/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
      }, token);
      load();
    } catch (e) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  const counts = useMemo(() => ({
    ALL: complaints.length,
    OPEN: complaints.filter(c => c.status === 'OPEN').length,
    ACTIVE: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    RESOLVED: complaints.filter(c => c.status === 'RESOLVED').length,
  }), [complaints]);

  const visible = useMemo(() => {
    if (filter === 'ALL') return complaints;
    if (filter === 'ACTIVE') return complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'OPEN');
    return complaints.filter(c => c.status === filter);
  }, [complaints, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader
          title="Complaints"
          actionLabel="New Request"
          onAction={() => navigation.navigate('NewComplaint')}
        />

        <View style={styles.filterRow}>
          {['ALL', 'ACTIVE', 'RESOLVED'].map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                { backgroundColor: colors.surfaceContainerLow },
                filter === f && { backgroundColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: colors.onSurfaceVariant },
                filter === f && { color: colors.onPrimary }
              ]}>
                {f} ({f === 'ACTIVE' ? (counts.OPEN + counts.ACTIVE) : counts[f]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item, index }) => (
          <ComplaintCard
            item={item}
            isAdmin={isAdmin}
            isLast={index === visible.length - 1}
            onAction={() => updateStatus(item.id, item.status)}
          />
        )}
        ListEmptyComponent={
          !refreshing && (
            <EmptyState
              icon="message-draw"
              title="No Complaints"
              subtitle="Everything seems to be running smoothly."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  filterText: {
    ...typography.labelSmall,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  cardMeta: {
    ...typography.labelSmall,
    marginTop: 4,
    opacity: 0.7,
  },
  cardDesc: {
    ...typography.bodyMedium,
    marginBottom: 20,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  actionBtnText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
});
