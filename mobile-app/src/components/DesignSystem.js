import React from 'react';
import { Pressable, StyleSheet, Text, View, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { radius, useAppTheme } from '../lib/theme';

export function Surface({ children, style, tone = 'default' }) {
  const { colors, shadow } = useAppTheme();
  const backgroundColor = tone === 'soft' ? colors.surfaceSoft : colors.surface;
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor, borderColor: colors.border },
        tone === 'elevated' ? shadow.lift : shadow.card,
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
  const { colors, shadow } = useAppTheme();
  const accentMap = {
    default: colors.primaryBlue,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    accent: colors.accent,
    indigo: '#4F46E5',
    slate: '#475569',
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
          ...shadow.card,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.surfaceSoft }]}>
        <MaterialCommunityIcons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={[styles.quickActionSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
      <View style={styles.actionChevronWrap}>
        <MaterialCommunityIcons name="arrow-right" size={13} color={accent} />
      </View>
    </Pressable>
  );
}

export function StatCard({ label, value, hint, delta, icon, tone = 'default', onPress }) {
  const { colors, shadow } = useAppTheme();
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
          ...shadow.card,
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
  const { colors, shadow } = useAppTheme();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow.card }]}>
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

export function ActivityRow({ title, subtitle, time, icon, tone = 'default', onPress, isLast }) {
  const { colors } = useAppTheme();
  const toneMap = {
    default: colors.primaryBlue,
    payment: colors.primaryBlue,
    notice: colors.warning,
    complaint: colors.danger,
    update: colors.success,
  };
  const color = toneMap[tone] || colors.primaryBlue;

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.activityRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <View style={[styles.activityIcon, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityTitleRow}>
            <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {time ? <Text style={[styles.activityTime, { color: colors.muted }]}>{time}</Text> : null}
          </View>
          <Text style={[styles.activitySubtitle, { color: colors.muted }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.borderStrong} />
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

export function NoticeCard({ title, body, category, time, expanded, onToggle }) {
  const { colors, shadow } = useAppTheme();
  const categoryColors = {
    GENERAL:     { bg: colors.surfaceSoft,   fg: colors.muted,   icon: 'bell-outline' },
    MAINTENANCE: { bg: 'rgba(217, 119, 6, 0.1)',   fg: colors.warning, icon: 'wrench-outline' },
    EMERGENCY:   { bg: 'rgba(239, 68, 68, 0.1)',    fg: colors.danger,  icon: 'alert-circle-outline' },
    EVENT:       { bg: 'rgba(22, 163, 74, 0.1)', fg: colors.success, icon: 'calendar-star-outline' },
    FINANCE:     { bg: 'rgba(37, 99, 235, 0.1)',    fg: colors.primaryBlue, icon: 'cash-multiple' },
  };
  const cat = String(category || 'GENERAL').toUpperCase();
  const c = categoryColors[cat] || categoryColors.GENERAL;

  return (
    <View style={[styles.noticeCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadow.card }]}>
      <View style={[styles.noticeStripe, { backgroundColor: c.fg }]} />
      <View style={styles.noticeBody}>
        <View style={styles.noticeTopRow}>
          <View style={[styles.categoryPill, { backgroundColor: c.bg }]}>
            <MaterialCommunityIcons name={c.icon} size={11} color={c.fg} />
            <Text style={[styles.categoryText, { color: c.fg }]}>{cat}</Text>
          </View>
          <Text style={[styles.noticeTime, { color: colors.muted }]}>{time}</Text>
        </View>
        <Text style={[styles.noticeTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.noticeExcerpt, { color: colors.muted }]} numberOfLines={expanded ? undefined : 3}>{body}</Text>
        <Pressable onPress={onToggle} style={styles.readMoreBtn}>
          <Text style={[styles.readMoreText, { color: colors.primaryBlue }]}>{expanded ? 'Show less' : 'Read more'}</Text>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primaryBlue} />
        </Pressable>
      </View>
    </View>
  );
}

export function SettingsRow({ label, value, icon, tone = 'default', onPress, isLast, destructive }) {
  const { colors } = useAppTheme();
  const toneMap = {
    default: colors.muted,
    blue: colors.primaryBlue,
    green: colors.success,
    amber: colors.warning,
    red: colors.danger,
    indigo: '#4F46E5',
  };
  const color = destructive ? colors.danger : (toneMap[tone] || colors.muted);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.settingsRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
      >
        <View style={[styles.settingsIcon, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={16} color={color} />
        </View>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsLabel, { color: destructive ? colors.danger : colors.text }]}>{label}</Text>
          {value ? <Text style={[styles.settingsValue, { color: colors.muted }]} numberOfLines={1}>{value}</Text> : null}
        </View>
        {!destructive && <MaterialCommunityIcons name="chevron-right" size={16} color={colors.borderStrong} />}
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
    </>
  );
}

export function FormField({ label, error, children, isLast }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.formField, !isLast && styles.formFieldMargin]}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      {children}
      {error ? <Text style={[styles.fieldError, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

export function FormInput({ value, onChangeText, placeholder, ...props }) {
  const { colors } = useAppTheme();
  return (
    <TextInput
      style={[styles.formInput, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      {...props}
    />
  );
}

export function FormPicker({ value, onValueChange, items, label }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.pickerWrap, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <Picker selectedValue={value} onValueChange={onValueChange}>
        {items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} />)}
      </Picker>
    </View>
  );
}

export function FormButton({ title, onPress, tone = 'primary', loading, disabled, icon }) {
  const { colors, shadow } = useAppTheme();
  const bg = tone === 'primary' ? colors.primary : (tone === 'danger' ? colors.danger : colors.surface);
  const fg = tone === 'secondary' ? colors.text : '#ffffff';
  const border = tone === 'secondary' ? colors.borderStrong : bg;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.formButton,
        { backgroundColor: bg, borderColor: border, opacity: (disabled || loading) ? 0.6 : (pressed ? 0.9 : 1) },
        tone !== 'secondary' && shadow.card,
      ]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
      <Text style={[styles.formButtonText, { color: fg }]}>{loading ? 'Please wait...' : title}</Text>
    </Pressable>
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.15,
    lineHeight: 18,
  },
  quickActionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  actionChevronWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
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
    padding: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  activitySubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
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
    borderRadius: radius.pill,
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
  },
  noticeTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  noticeExcerpt: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsContent: {
    flex: 1,
    minWidth: 0,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  settingsValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },
  formField: {
    width: '100%',
  },
  formFieldMargin: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  formInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  pickerWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
  },
  formButtonText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
