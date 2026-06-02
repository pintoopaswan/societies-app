import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

function NoticeCard({ item, expanded, onToggle }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.categoryPill, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <Text style={[styles.categoryText, { color: colors.text }]}>{item.category}</Text>
        </View>
        <Text style={[styles.dateText, { color: colors.muted }]}>{item.time}</Text>
      </View>

      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.cardBody, { color: colors.muted }]} numberOfLines={expanded ? undefined : 3}>
        {item.body}
      </Text>

      <View style={styles.cardBottom}>
        <TouchableOpacity onPress={onToggle} style={[styles.readButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <Text style={[styles.readButtonText, { color: colors.text }]}>{expanded ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
        <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.status}</Text>
      </View>
    </View>
  );
}

export default function NoticesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const { colors } = useAppTheme();
  const [notices, setNotices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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

  useFocusEffect(
    useCallback(() => {
      loadNotices();
    }, [loadNotices]),
  );

  const featured = useMemo(() => notices.slice(0, 4), [notices]);

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadNotices} tintColor={colors.primaryBlue} />}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />

        <View style={styles.heroTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroKicker, { color: colors.muted }]}>NOTICES</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Community updates with a calmer reading experience</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
              Important announcements are presented as elegant cards that are easy to scan on mobile.
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity style={[styles.heroButton, { backgroundColor: colors.primaryBlue }]} onPress={() => navigation.navigate('NewNotice')}>
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.heroStats}>
          <View style={[styles.heroStat, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Published</Text>
            <Text style={[styles.heroStatValue, { color: colors.text }]}>{notices.length || 0}</Text>
          </View>
          <View style={[styles.heroStat, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <Text style={[styles.heroStatLabel, { color: colors.muted }]}>Latest</Text>
            <Text style={[styles.heroStatValue, { color: colors.text }]}>{notices[0]?.category || 'GENERAL'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Featured Notices"
          subtitle="Pinned and recent announcements, with a built-in read more interaction."
          actionLabel={isAdmin ? 'New notice' : 'Refresh'}
          onAction={() => (isAdmin ? navigation.navigate('NewNotice') : loadNotices())}
        />
        {featured.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="bell-outline" size={28} color={colors.primaryBlue} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notices available yet</Text>
            <Text style={[styles.emptyCopy, { color: colors.muted }]}>Announcements will appear here as soon as they’re published.</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {featured.map((notice) => (
              <NoticeCard
                key={String(notice.id)}
                item={{
                  title: notice.title,
                  body: notice.body,
                  category: notice.category || 'GENERAL',
                  time: timeAgo(notice.published_at || notice.created_at),
                  status: notice.status || 'PUBLISHED',
                }}
                expanded={expandedId === notice.id}
                onToggle={() => setExpandedId((prev) => (prev === notice.id ? null : notice.id))}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader
          title="Notice Stream"
          subtitle="A full list of announcements, styled for comfortable reading."
          actionLabel="Refresh"
          onAction={loadNotices}
        />
        <View style={styles.streamWrap}>
          {notices.map((notice) => (
            <TouchableOpacity
              key={String(notice.id)}
              activeOpacity={0.92}
              onPress={() => setExpandedId((prev) => (prev === notice.id ? null : notice.id))}
              style={[styles.streamRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.streamTop}>
                <Text style={[styles.streamTitle, { color: colors.text }]} numberOfLines={1}>{notice.title}</Text>
                <Text style={[styles.streamDate, { color: colors.muted }]}>{timeAgo(notice.published_at || notice.created_at)}</Text>
              </View>
              <Text style={[styles.streamBody, { color: colors.muted }]} numberOfLines={2}>{notice.body}</Text>
              <View style={styles.streamBottom}>
                <Text style={[styles.streamMeta, { color: colors.muted }]}>{notice.category || 'GENERAL'}</Text>
                <Text style={[styles.streamMeta, { color: colors.primaryBlue }]}>{expandedId === notice.id ? 'Hide' : 'Read more'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    top: -30,
    right: -18,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(37, 99, 235, 0.07)',
  },
  heroGlowB: {
    position: 'absolute',
    bottom: -40,
    left: -26,
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
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  cardBottom: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  readButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  streamWrap: {
    gap: 10,
  },
  streamRow: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  streamTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  streamTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
  },
  streamDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  streamBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  streamBottom: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  streamMeta: {
    fontSize: 12,
    fontWeight: '700',
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
