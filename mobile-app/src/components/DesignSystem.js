import React from 'react';
import { StyleSheet, Text, View, TextInput, Animated, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { radius, elevation, typography, useAppTheme } from '../lib/theme';

/**
 * MD3 Surface component
 * Supports different container levels
 */
export function Surface({ children, style, level = 1, tone = 'default' }) {
  const { colors } = useAppTheme();

  const containerColors = [
    colors.surface,
    colors.surfaceContainerLow,
    colors.surfaceContainer,
    colors.surfaceContainerHigh,
    colors.surfaceContainerHighest,
  ];

  const backgroundColor = tone === 'soft' ? colors.surfaceVariant : (containerColors[level] || colors.surface);
  const shadowStyle = level > 0 ? elevation[`level${level}`] : {};

  return (
    <View
      style={[
        styles.surface,
        { backgroundColor, borderRadius: radius.lg },
        shadowStyle,
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
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionChip,
            { backgroundColor: colors.secondaryContainer, opacity: pressed ? 0.72 : 1 }
          ]}
        >
          <Text style={{ color: colors.onSecondaryContainer, ...typography.labelLarge }}>{actionLabel}</Text>
          <MaterialCommunityIcons name={icon} size={18} color={colors.onSecondaryContainer} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }) {
  const { colors } = useAppTheme();
  const palette = {
    neutral: { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant },
    info: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
    success: { bg: '#C4EED0', fg: '#072711' },
    warning: { bg: '#FFE08E', fg: '#241A00' },
    danger: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  }[tone] || { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function QuickAction({ title, subtitle, icon, onPress, tone = 'primary' }) {
  const { colors } = useAppTheme();
  const bg = tone === 'primary' ? colors.primaryContainer : colors.secondaryContainer;
  const fg = tone === 'primary' ? colors.onPrimaryContainer : colors.onSecondaryContainer;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...elevation.level1,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name={icon} size={24} color={fg} />
      </View>
      <Text style={[styles.quickActionTitle, { color: fg }]} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={[styles.quickActionSubtitle, { color: fg, opacity: 0.8 }]} numberOfLines={2}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function StatCard({ label, value, hint, delta, icon, tone = 'primary', onPress }) {
  const { colors } = useAppTheme();
  const bg = colors.surfaceContainerLow;
  const accent = tone === 'primary' ? colors.primary : colors.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: bg,
          opacity: pressed ? 0.92 : 1,
          transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
          ...elevation.level1,
        },
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
          <MaterialCommunityIcons name={icon} size={22} color={accent} />
        </View>
        {delta ? <Badge label={delta} tone={delta.startsWith('-') ? 'danger' : 'success'} /> : null}
      </View>
      <Text style={[styles.statValue, { color: colors.onSurface }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{label}</Text>
      {hint ? <Text style={[styles.statHint, { color: colors.onSurfaceVariant, opacity: 0.7 }]} numberOfLines={2}>{hint}</Text> : null}
    </Pressable>
  );
}

export function Skeleton({ width, height, radius: r = radius.sm, style }) {
  const { colors } = useAppTheme();
  const animatedValue = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: colors.surfaceContainerHighest,
          borderRadius: r,
          opacity: animatedValue,
        },
        style,
      ]}
    />
  );
}

export function FormButton({ title, onPress, tone = 'primary', loading, disabled, icon, style }) {
  const { colors } = useAppTheme();

  let bg, fg;
  if (tone === 'primary') {
    bg = colors.primary;
    fg = colors.onPrimary;
  } else if (tone === 'secondary') {
    bg = colors.secondaryContainer;
    fg = colors.onSecondaryContainer;
  } else if (tone === 'outlined') {
    bg = 'transparent';
    fg = colors.primary;
  } else if (tone === 'danger') {
    bg = colors.error;
    fg = colors.onError;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.formButton,
        {
          backgroundColor: bg,
          borderColor: tone === 'outlined' ? colors.outline : 'transparent',
          borderWidth: tone === 'outlined' ? 1 : 0,
          opacity: (disabled || loading) ? 0.6 : (pressed ? 0.9 : 1)
        },
        tone !== 'outlined' && elevation.level1,
        style,
      ]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
      <Text style={[styles.formButtonText, { color: fg, ...typography.labelLarge }]}>
        {loading ? 'Please wait...' : title}
      </Text>
    </Pressable>
  );
}

export function FormInput({ value, onChangeText, placeholder, error, ...props }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={[
          styles.formInput,
          {
            backgroundColor: colors.surfaceContainerLowest,
            borderColor: error ? colors.error : colors.outline,
            color: colors.onSurface
          }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        {...props}
      />
      {error ? <Text style={[styles.fieldError, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

export function FormField({ label, children, isLast, style }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.formField, !isLast && styles.formFieldMargin, style]}>
      <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      {children}
    </View>
  );
}

export function EmptyState({ title, subtitle, icon = 'inbox-outline', actionLabel, onAction }) {
  const { colors } = useAppTheme();
  return (
    <Surface level={1} style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondaryContainer }]}>
        <MaterialCommunityIcons name={icon} size={32} color={colors.onSecondaryContainer} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface, ...typography.headlineSmall }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant, ...typography.bodyMedium }]}>{subtitle}</Text> : null}
      {actionLabel ? (
        <FormButton title={actionLabel} onPress={onAction} style={{ marginTop: 8 }} />
      ) : null}
    </Surface>
  );
}

export function ActivityRow({ title, subtitle, time, icon, tone = 'default', onPress, onAction, isLast }) {
  const { colors } = useAppTheme();
  const color = (tone === 'danger' || tone === 'error') ? colors.error : (tone === 'success' ? colors.success : colors.primary);

  return (
    <>
      <Pressable
        onPress={onAction || onPress}
        style={({ pressed }) => [
          styles.activityRow,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.activityIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityTitleRow}>
            <Text style={[styles.activityTitle, { color: colors.onSurface, ...typography.titleMedium }]} numberOfLines={1}>{title}</Text>
            {time ? <Text style={[styles.activityTime, { color: colors.onSurfaceVariant, ...typography.labelSmall }]}>{time}</Text> : null}
          </View>
          <Text style={[styles.activitySubtitle, { color: colors.onSurfaceVariant, ...typography.bodyMedium }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} />
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
    </>
  );
}

export function ProgressBar({ value = 0, color, label }) {
  const { colors } = useAppTheme();
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressRow}>
        {label ? <Text style={[styles.progressLabel, { color: colors.onSurface, ...typography.labelLarge }]}>{label}</Text> : null}
        <Text style={[styles.progressValue, { color: colors.onSurfaceVariant, ...typography.labelMedium }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color || colors.primary }]} />
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
            <View style={[styles.sparklineBar, { height, backgroundColor: color || colors.primary }]} />
          </View>
        );
      })}
    </View>
  );
}

export function NoticeCard({ title, body, category, time, expanded, onToggle }) {
  const { colors } = useAppTheme();
  const categoryColors = {
    GENERAL:     { bg: colors.secondaryContainer,   fg: colors.onSecondaryContainer,   icon: 'bell-outline' },
    MAINTENANCE: { bg: colors.tertiaryContainer,    fg: colors.onTertiaryContainer,    icon: 'wrench-outline' },
    EMERGENCY:   { bg: colors.errorContainer,       fg: colors.onErrorContainer,       icon: 'alert-circle-outline' },
    EVENT:       { bg: '#C4EED0',                   fg: '#072711',                     icon: 'calendar-star-outline' },
    FINANCE:     { bg: colors.primaryContainer,     fg: colors.onPrimaryContainer,     icon: 'cash-multiple' },
  };
  const cat = String(category || 'GENERAL').toUpperCase();
  const c = categoryColors[cat] || categoryColors.GENERAL;

  return (
    <Surface level={1} style={styles.noticeCard}>
      <View style={styles.noticeBody}>
        <View style={styles.noticeTopRow}>
          <View style={[styles.categoryPill, { backgroundColor: c.bg }]}>
            <MaterialCommunityIcons name={c.icon} size={12} color={c.fg} />
            <Text style={[styles.categoryText, { color: c.fg }]}>{cat}</Text>
          </View>
          <Text style={[styles.noticeTime, { color: colors.onSurfaceVariant, ...typography.labelSmall }]}>{time}</Text>
        </View>
        <Text style={[styles.noticeTitle, { color: colors.onSurface, ...typography.titleMedium }]}>{title}</Text>
        <Text style={[styles.noticeExcerpt, { color: colors.onSurfaceVariant, ...typography.bodyMedium }]} numberOfLines={expanded ? undefined : 3}>{body}</Text>
        <Pressable onPress={onToggle} style={styles.readMoreBtn}>
          <Text style={[styles.readMoreText, { color: colors.primary, ...typography.labelLarge }]}>{expanded ? 'Show less' : 'Read more'}</Text>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </Pressable>
      </View>
    </Surface>
  );
}

export function SettingsRow({ label, value, icon, tone = 'default', onPress, isLast, destructive }) {
  const { colors } = useAppTheme();
  const color = destructive ? colors.error : (tone === 'primary' ? colors.primary : colors.onSurfaceVariant);

  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.settingsRow,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={[styles.settingsIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsLabel, { color: destructive ? colors.error : colors.onSurface, ...typography.titleMedium }]}>{label}</Text>
          {value ? <Text style={[styles.settingsValue, { color: colors.onSurfaceVariant, ...typography.bodyMedium }]} numberOfLines={1}>{value}</Text> : null}
        </View>
        {!destructive && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} />}
      </Pressable>
      {!isLast && <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />}
    </>
  );
}

export function FormPicker({ value, onValueChange, items, label }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.pickerWrap, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outline }]}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        dropdownIconColor={colors.onSurfaceVariant}
      >
        {items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} color={colors.onSurface} />)}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    padding: 16,
  },
  progressWrap: {
    gap: 8,
    marginTop: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontWeight: '700',
  },
  progressValue: {
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  sparklineRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  sparklineSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  sparklineBar: {
    width: '100%',
    borderRadius: radius.xs,
  },
  noticeCard: {
    padding: 0,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: radius.xl,
  },
  noticeBody: {
    padding: 16,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    ...typography.labelSmall,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noticeTime: {
  },
  noticeTitle: {
    fontWeight: '700',
  },
  noticeExcerpt: {
    marginTop: 8,
    lineHeight: 20,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  readMoreText: {
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    fontWeight: '600',
  },
  settingsValue: {
    marginTop: 2,
  },
  pickerWrap: {
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.headlineSmall,
  },
  sectionSubtitle: {
    ...typography.bodyMedium,
    marginTop: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badge: {
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
  quickAction: {
    width: '48%',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    ...typography.titleMedium,
  },
  quickActionSubtitle: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  statCard: {
    width: '48%',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.headlineSmall,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.labelMedium,
    marginTop: 4,
  },
  statHint: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  formButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  formButtonText: {
    fontWeight: '700',
  },
  inputContainer: {
    width: '100%',
  },
  formInput: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.bodyLarge,
  },
  fieldError: {
    ...typography.bodySmall,
    marginTop: 4,
    marginLeft: 4,
  },
  formField: {
    width: '100%',
  },
  formFieldMargin: {
    marginBottom: 20,
  },
  fieldLabel: {
    ...typography.labelLarge,
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: radius.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    flex: 1,
  },
  activityTime: {
    marginLeft: 8,
  },
  activitySubtitle: {
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
});
