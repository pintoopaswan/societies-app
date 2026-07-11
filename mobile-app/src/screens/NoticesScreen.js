import React, { useCallback, useMemo, useState } from 'react';
import {
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
  NoticeCard as DSNoticeCard,
  EmptyState,
  StatCard,
} from '../components/DesignSystem';

/** Robust time format helper */
function formatRelativeTime(value) {
  if (!value) return '';
  try {
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

export default function NoticesScreen() {
  const navigation  = useNavigation();
  const insets = useSafeAreaInsets();
  const { user }    = useAuth();
  const { colors } = useAppTheme();
  const isAdmin     = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [notices,    setNotices]    = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const loadNotices = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/notices');
      setNotices(res.data || []);
    } catch {
      setNotices([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotices(); }, [loadNotices]));

  const stats = useMemo(() => {
    if (notices.length === 0) return [];
    return [
      { label: 'Active Notices', value: notices.length, icon: 'bullhorn-variant', tone: 'primary' },
      { label: 'Latest Update', value: notices[0]?.category || 'Notice', icon: 'clock-check-outline', tone: 'secondary' },
    ];
  }, [notices]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader
          title="Boardroom"
          subtitle="Official announcements and updates."
          actionLabel={isAdmin ? "Create" : undefined}
          onAction={() => navigation.navigate('NewNotice')}
        />

        {stats.length > 0 && (
          <View style={styles.statsRow}>
            {stats.map((s, idx) => (
              <StatCard key={idx} {...s} />
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={notices}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadNotices} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <DSNoticeCard
            title={item.title}
            body={item.body}
            category={item.category || 'GENERAL'}
            time={formatRelativeTime(item.published_at || item.created_at)}
            expanded={expandedId === item.id}
            onToggle={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          !refreshing && (
            <EmptyState
              icon="bullhorn-variant-outline"
              title="No Updates"
              subtitle="Announcements from society admin will appear here."
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
});
