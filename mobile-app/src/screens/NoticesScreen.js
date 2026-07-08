import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  NoticeCard as DSNoticeCard,
  ActivityRow,
  Surface,
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
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return String(value);
  }
}

/** Compact stream row — full list */
function StreamRow({ notice, expanded, onToggle, isLast }) {
  return (
    <ActivityRow
      title={notice.title}
      subtitle={notice.body}
      time={timeAgo(notice.published_at || notice.created_at)}
      icon="bell-outline"
      tone="notice"
      onPress={onToggle}
      isLast={isLast}
    />
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NoticesScreen() {
  const navigation  = useNavigation();
  const { user }    = useAuth();
  const { colors, radius } = useAppTheme();
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

  // Top 3 notices as "featured" cards; rest go to the stream list
  const featured = useMemo(() => notices.slice(0, 3), [notices]);
  const stream   = useMemo(() => notices.slice(3),    [notices]);

  const totalPublished = notices.length;
  const latestCategory = notices[0]?.category || 'GENERAL';

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadNotices}
          tintColor={colors.primaryBlue}
        />
      }
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={[s.headerKicker, { color: colors.muted }]}>Community Board</Text>
          <Text style={[s.headerTitle, { color: colors.text }]}>Notices</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={[s.headerAddBtn, { backgroundColor: colors.primaryBlue }]}
            onPress={() => navigation.navigate('NewNotice')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <View style={s.statsStrip}>
        <Surface style={s.statCard}>
          <Text style={[s.statLabel, { color: colors.muted }]}>Published</Text>
          <Text style={[s.statValue, { color: colors.text }]}>{totalPublished}</Text>
        </Surface>
        <Surface style={[s.statCard, { backgroundColor: colors.accentSoft, borderColor: colors.primaryBlue + '20' }]}>
          <Text style={[s.statLabel, { color: colors.primaryBlue }]}>Latest</Text>
          <Text style={[s.statValue, { color: colors.primaryBlue }]}>
            {String(latestCategory).toUpperCase()}
          </Text>
        </Surface>
      </View>

      {/* ── Featured ───────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHeader
          title="Featured"
          actionLabel={isAdmin ? 'New notice' : undefined}
          onAction={() => navigation.navigate('NewNotice')}
        />

        {featured.length === 0 ? (
          <EmptyState
            icon="bell-outline"
            title="No notices yet"
            subtitle="Community announcements will appear here as soon as they're published."
          />
        ) : (
          <View style={s.stack}>
            {featured.map((notice) => (
              <DSNoticeCard
                key={String(notice.id)}
                title={notice.title}
                body={notice.body}
                category={notice.category || 'GENERAL'}
                time={timeAgo(notice.published_at || notice.created_at)}
                expanded={expandedId === notice.id}
                onToggle={() => toggle(notice.id)}
              />
            ))}
          </View>
        )}
      </View>

      {/* ── All notices stream ─────────────────────────────────────────────── */}
      {stream.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="All Notices"
            actionLabel="Refresh"
            onAction={loadNotices}
          />
          <Surface style={{ padding: 0 }}>
            {stream.map((notice, idx) => (
              <StreamRow
                key={String(notice.id)}
                notice={notice}
                expanded={expandedId === notice.id}
                onToggle={() => toggle(notice.id)}
                isLast={idx === stream.length - 1}
              />
            ))}
          </Surface>
        </View>
      )}

      <View style={{ height: 48 }} />
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  headerLeft: {
    gap: 2,
  },
  headerKicker: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // ── Stats strip ───────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 28,
  },

  // ── Featured notice cards ─────────────────────────────────────────────────
  stack: {
    gap: 10,
  },
});