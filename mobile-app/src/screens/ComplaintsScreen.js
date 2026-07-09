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
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

/** Time format helper */
function timeAgo(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  } catch { return ''; }
}

const STATUS_MAP = {
  OPEN:        { label: 'Open',        tone: 'warning' },
  IN_PROGRESS: { label: 'In Progress', tone: 'info'    },
  RESOLVED:    { label: 'Resolved',    tone: 'success' },
};

/** Complaint Card component */
const ComplaintCard = React.memo(({ item, isAdmin, onAction, isLast }) => {
  const { colors } = useAppTheme();
  const s = STATUS_MAP[item.status] || STATUS_MAP.OPEN;

  return (
    <Surface level={1} style={[styles.card, !isLast && styles.cardBorder]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleArea}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.onSurfaceVariant }]}>
            {item.block} · {item.flat} · {timeAgo(item.created_at)}
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
          <MaterialCommunityIcons name="account-tie-outline" size={16} color={colors.onSurfaceVariant} />
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
              {item.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
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
          actionLabel="New"
          onAction={() => navigation.navigate('NewComplaint')}
        />

        <View style={styles.filterRow}>
          {['ALL', 'ACTIVE', 'RESOLVED'].map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                { backgroundColor: colors.surfaceContainerHighest },
                filter === f && { backgroundColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: colors.onSurfaceVariant },
                filter === f && { color: colors.onPrimary }
              ]}>
                {f} ({counts[f] || (f === 'ACTIVE' ? (counts.OPEN + counts.ACTIVE) : 0)})
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
              icon="ticket-outline"
              title="No complaints"
              subtitle="Community issues will appear here."
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
    paddingBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 100,
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
    padding: 16,
    borderRadius: 0,
    borderBottomWidth: 0,
  },
  cardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    ...typography.bodySmall,
    marginTop: 2,
  },
  cardDesc: {
    ...typography.bodyMedium,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    ...typography.labelSmall,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  actionBtnText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
});
