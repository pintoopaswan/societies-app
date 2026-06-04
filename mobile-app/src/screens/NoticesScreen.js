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

// ─── Design tokens — identical to DashboardScreen & TenantDetailsScreen ──────

const P = {
  bg:           '#F6F7F9',
  surface:      '#FFFFFF',
  surfaceMuted: '#F2F4F7',

  ink:          '#0D0F12',
  inkSecondary: '#5C6470',
  inkTertiary:  '#9EA5B0',

  blue:         '#1D6AF0',
  blueSoft:     '#EBF2FF',
  blueMid:      '#D4E5FD',

  indigo:       '#4F46E5',
  indigoSoft:   '#EEF0FD',
  indigoMid:    '#DFE2FB',

  emerald:      '#059669',
  emeraldSoft:  '#EAFAF4',
  emeraldMid:   '#C6F0DF',

  amber:        '#C07818',
  amberSoft:    '#FDF6E8',
  amberMid:     '#F5DCAA',

  rose:         '#DC2C55',
  roseSoft:     '#FFF0F3',

  slate:        '#475569',
  slateSoft:    '#F0F2F5',

  border:       '#E8EAED',
  borderFaint:  '#F2F4F6',
};

const R = {
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  xxl:  26,
  pill: 999,
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#0D0F12',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

// Category → pastel token map
const CATEGORY_PALETTE = {
  GENERAL:     { bg: P.slateSoft,   fg: P.slate,   icon: 'bell-outline'             },
  MAINTENANCE: { bg: P.amberSoft,   fg: P.amber,   icon: 'wrench-outline'           },
  EMERGENCY:   { bg: P.roseSoft,    fg: P.rose,    icon: 'alert-circle-outline'     },
  EVENT:       { bg: P.emeraldSoft, fg: P.emerald, icon: 'calendar-star-outline'    },
  FINANCE:     { bg: P.blueSoft,    fg: P.blue,    icon: 'cash-multiple'            },
};

function categoryStyle(raw) {
  const key = String(raw || 'GENERAL').toUpperCase();
  return CATEGORY_PALETTE[key] || CATEGORY_PALETTE.GENERAL;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Shared section heading row */
function SectionHeader({ title, onAction, actionLabel }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={s.sectionAction} activeOpacity={0.75}>
          <Text style={s.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={P.blue} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Featured notice card — expandable body */
function NoticeCard({ item, expanded, onToggle }) {
  const cat = categoryStyle(item.category);

  return (
    <View style={s.noticeCard}>
      {/* Left accent stripe */}
      <View style={[s.noticeStripe, { backgroundColor: cat.fg }]} />

      <View style={s.noticeBody}>
        {/* Top row: category pill + timestamp */}
        <View style={s.noticeTopRow}>
          <View style={[s.categoryPill, { backgroundColor: cat.bg }]}>
            <MaterialCommunityIcons name={cat.icon} size={11} color={cat.fg} />
            <Text style={[s.categoryText, { color: cat.fg }]}>
              {String(item.category || 'GENERAL').toUpperCase()}
            </Text>
          </View>
          <Text style={s.noticeTime}>{item.time}</Text>
        </View>

        {/* Title */}
        <Text style={s.noticeTitle}>{item.title}</Text>

        {/* Body — clamped unless expanded */}
        <Text
          style={s.noticeExcerpt}
          numberOfLines={expanded ? undefined : 3}
        >
          {item.body}
        </Text>

        {/* Footer */}
        <TouchableOpacity
          onPress={onToggle}
          style={s.readMoreBtn}
          activeOpacity={0.75}
        >
          <Text style={s.readMoreText}>{expanded ? 'Show less' : 'Read more'}</Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={P.blue}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Compact stream row — full list */
function StreamRow({ notice, expanded, onToggle }) {
  const cat = categoryStyle(notice.category);

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.82}
      style={s.streamRow}
    >
      {/* Category icon */}
      <View style={[s.streamIconWrap, { backgroundColor: cat.bg }]}>
        <MaterialCommunityIcons name={cat.icon} size={16} color={cat.fg} />
      </View>

      <View style={s.streamContent}>
        {/* Title + time */}
        <View style={s.streamTitleRow}>
          <Text style={s.streamTitle} numberOfLines={expanded ? undefined : 1}>
            {notice.title}
          </Text>
          <Text style={s.streamTime}>
            {timeAgo(notice.published_at || notice.created_at)}
          </Text>
        </View>

        {/* Body */}
        <Text
          style={s.streamBody}
          numberOfLines={expanded ? undefined : 2}
        >
          {notice.body}
        </Text>

        {/* Bottom meta row */}
        <View style={s.streamMeta}>
          <View style={[s.streamCatTag, { backgroundColor: cat.bg }]}>
            <Text style={[s.streamCatText, { color: cat.fg }]}>
              {String(notice.category || 'GENERAL').toUpperCase()}
            </Text>
          </View>
          <Text style={s.streamToggleText}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Full-page empty state */
function EmptyState() {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconWrap}>
        <MaterialCommunityIcons name="bell-outline" size={28} color={P.blue} />
      </View>
      <Text style={s.emptyTitle}>No notices yet</Text>
      <Text style={s.emptyBody}>
        Community announcements will appear here as soon as they're published.
      </Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NoticesScreen() {
  const navigation  = useNavigation();
  const { user }    = useAuth();
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
          tintColor={P.blue}
        />
      }
      style={{ backgroundColor: P.bg }}
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {/*
       * Clean, minimal header matching the DashboardScreen pattern:
       * greeting-style label + title + optional admin CTA icon.
       * No oversized hero paragraph, no decorative blobs that overwhelm.
       */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerKicker}>Community Board</Text>
          <Text style={s.headerTitle}>Notices</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={s.headerAddBtn}
            onPress={() => navigation.navigate('NewNotice')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <View style={s.statsStrip}>
        <View style={s.statCard}>
          <Text style={s.statLabel}>Published</Text>
          <Text style={s.statValue}>{totalPublished}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: P.blueSoft, borderColor: P.blueMid }]}>
          <Text style={[s.statLabel, { color: P.blue }]}>Latest</Text>
          <Text style={[s.statValue, { color: P.blue }]}>
            {String(latestCategory).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── Featured ───────────────────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHeader
          title="Featured"
          actionLabel={isAdmin ? 'New notice' : undefined}
          onAction={() => navigation.navigate('NewNotice')}
        />

        {featured.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={s.stack}>
            {featured.map((notice) => (
              <NoticeCard
                key={String(notice.id)}
                item={{
                  title:    notice.title,
                  body:     notice.body,
                  category: notice.category || 'GENERAL',
                  time:     timeAgo(notice.published_at || notice.created_at),
                  status:   notice.status || 'PUBLISHED',
                }}
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
          <View style={s.streamCard}>
            {stream.map((notice, idx) => (
              <React.Fragment key={String(notice.id)}>
                <StreamRow
                  notice={notice}
                  expanded={expandedId === notice.id}
                  onToggle={() => toggle(notice.id)}
                />
                {idx < stream.length - 1 && <View style={s.streamDivider} />}
              </React.Fragment>
            ))}
          </View>
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
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  headerLeft: {
    gap: 2,
  },
  headerKicker: {
    fontSize: 13,
    fontWeight: '500',
    color: P.inkTertiary,
    letterSpacing: 0.1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: P.ink,
    letterSpacing: -0.6,
  },
  headerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: R.xl,
    backgroundColor: P.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: P.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  // ── Stats strip ───────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    ...CARD_SHADOW,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: P.ink,
    letterSpacing: -0.4,
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
    color: P.ink,
    letterSpacing: -0.3,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: P.blueSoft,
    borderRadius: R.pill,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.blue,
  },

  // ── Featured notice cards ─────────────────────────────────────────────────
  stack: {
    gap: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: P.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
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
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noticeTime: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkTertiary,
  },
  noticeTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.2,
  },
  noticeExcerpt: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: P.inkSecondary,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: P.blueSoft,
    borderRadius: R.pill,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.blue,
  },

  // ── Stream list card ──────────────────────────────────────────────────────
  streamCard: {
    backgroundColor: P.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  streamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  streamDivider: {
    height: 1,
    backgroundColor: P.borderFaint,
    marginHorizontal: 16,
  },
  streamIconWrap: {
    width: 38,
    height: 38,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  streamContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  streamTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  streamTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  streamTime: {
    fontSize: 11,
    fontWeight: '600',
    color: P.inkTertiary,
    flexShrink: 0,
    paddingTop: 1,
  },
  streamBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: P.inkSecondary,
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  streamCatTag: {
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streamCatText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  streamToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.blue,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: P.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: P.border,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    ...CARD_SHADOW,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: R.lg,
    backgroundColor: P.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: P.inkSecondary,
    textAlign: 'center',
  },
});