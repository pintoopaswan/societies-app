import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius, useAppTheme } from '../lib/theme';

export function Surface({ children, style, tone = 'default' }) {
  const { colors, shadow } = useAppTheme();
  const backgroundColor = tone === 'soft' ? colors.surfaceSoft : colors.surface;
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor, borderColor: colors.border, shadowColor: '#000' },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, icon = 'chevron-right' }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.actionChip, { borderColor: colors.border, backgroundColor: colors.surfaceSoft, opacity: pressed ? 0.72 : 1 }]}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{actionLabel}</Text>
          <MaterialCommunityIcons name={icon} size={16} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }) {
  const { colors } = useAppTheme();
  const palette = {
    neutral: { bg: colors.surfaceSoft, fg: colors.text, border: colors.border },
    info: { bg: colors.accentSoft, fg: colors.accent, border: colors.border },
    success: { bg: 'rgba(16, 185, 129, 0.12)', fg: colors.success, border: colors.border },
    warning: { bg: 'rgba(251, 191, 36, 0.14)', fg: colors.warning, border: colors.border },
    danger: { bg: 'rgba(248, 113, 113, 0.14)', fg: colors.danger, border: colors.border },
  }[tone] || { bg: colors.surfaceSoft, fg: colors.text, border: colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function QuickAction({ title, subtitle, icon, onPress, tone = 'default' }) {
  const { colors } = useAppTheme();
  const accentMap = {
    default: colors.primaryBlue,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
  };
  const accent = accentMap[tone] || colors.primaryBlue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceSoft }]}>
        <MaterialCommunityIcons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={[styles.quickActionSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function StatCard({ label, value, hint, delta, icon, tone = 'default', onPress }) {
  const { colors } = useAppTheme();
  const accentMap = {
    default: colors.primaryBlue,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
  };
  const accent = accentMap[tone] || colors.primaryBlue;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
        },
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: colors.surfaceSoft }]}>
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
        </View>
        {delta ? <Badge label={delta} tone={delta.startsWith('-') ? 'danger' : 'success'} /> : null}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      {hint ? <Text style={[styles.statHint, { color: colors.muted }]} numberOfLines={2}>{hint}</Text> : null}
    </Pressable>
  );
}

export function ProgressBar({ value = 0, color, label }) {
  const { colors } = useAppTheme();
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.muted }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color || colors.primaryBlue }]} />
      </View>
    </View>
  );
}

export function Sparkline({ values = [], color }) {
  const { colors } = useAppTheme();
  const safeValues = values.length > 0 ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...safeValues, 1);
  return (
    <View style={styles.sparklineRow}>
      {safeValues.map((value, idx) => {
        const height = `${Math.max(8, (value / max) * 100)}%`;
        return (
          <View key={`${idx}-${value}`} style={styles.sparklineSlot}>
            <View style={[styles.sparklineBar, { height, backgroundColor: color || colors.primaryBlue }]} />
          </View>
        );
      })}
    </View>
  );
}

export function EmptyState({ title, subtitle, icon = 'inbox-outline', actionLabel, onAction }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSoft }]}>
        <MaterialCommunityIcons name={icon} size={28} color={colors.primaryBlue} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.emptyAction, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  quickAction: {
    width: '48.5%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 14,
    minHeight: 134,
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  quickActionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  statCard: {
    width: '48.5%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  statHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
  progressWrap: {
    gap: 8,
    marginTop: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  sparklineRow: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 12,
  },
  sparklineSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  sparklineBar: {
    width: '100%',
    borderRadius: radius.pill,
  },
  emptyState: {
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyAction: {
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '800',
  },
});
