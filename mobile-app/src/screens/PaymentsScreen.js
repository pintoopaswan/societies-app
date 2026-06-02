import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';
import { useAuth } from '../lib/auth';

// ─── Design tokens (mirrors DashboardScreen) ──────────────────────────────────

const PALETTE = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F3F4F6',

  ink: '#0F0F10',
  inkSecondary: '#6B7280',
  inkTertiary: '#9CA3AF',

  blue: '#2563EB',
  blueSoft: '#EFF4FF',
  blueMid: '#DBEAFE',

  indigo: '#4F46E5',
  indigoSoft: '#EEF2FF',

  emerald: '#059669',
  emeraldSoft: '#ECFDF5',

  amber: '#D97706',
  amberSoft: '#FFFBEB',

  rose: '#E11D48',
  roseSoft: '#FFF1F2',

  slate: '#475569',
  slateSoft: '#F1F5F9',

  border: '#E5E7EB',
  borderSoft: '#F3F4F6',

  overlay: 'rgba(0,0,0,0.45)',
};

const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
});

const TONE_MAP = {
  success: { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald },
  accent:  { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo  },
  info:    { bg: PALETTE.blueSoft,    fg: PALETTE.blue    },
  warning: { bg: PALETTE.amberSoft,   fg: PALETTE.amber   },
  danger:  { bg: PALETTE.roseSoft,    fg: PALETTE.rose    },
  neutral: { bg: PALETTE.slateSoft,   fg: PALETTE.slate   },
  default: { bg: PALETTE.slateSoft,   fg: PALETTE.slate   },
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function formatAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function formatLedgerDate(value) {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

function buildCsv(entries) {
  const header = ['block', 'flat', 'tenant_name', 'amount', 'year', 'month', 'payment_date', 'mode_of_payment', 'notes'];
  const rows = entries.map((item) =>
    header.map((key) => {
      const raw = item[key];
      const safe = String(raw == null ? '' : raw).replaceAll('"', '""');
      return `"${safe}"`;
    }).join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

const YEARS = Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => String(2025 + i));
const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge — mirrors Dashboard's Pill */
function Pill({ label, tone = 'default', icon }) {
  const t = TONE_MAP[tone] || TONE_MAP.default;
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={11} color={t.fg} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Section header — identical to Dashboard's SectionHeader */
function SectionHeader({ title, subtitle, onAction, actionLabel }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} activeOpacity={0.7}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.blue} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Surface card — white elevated container */
function Surface({ children, style }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

/** Stat card — 2-col grid tile */
function StatCard({ label, value, hint, icon, tone = 'default' }) {
  const t = TONE_MAP[tone] || TONE_MAP.default;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: t.bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={t.fg} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

/** Empty state — mirrors Dashboard's EmptyState */
function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
        <MaterialCommunityIcons name={icon} size={26} color={PALETTE.blue} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptyBody}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyAction,
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Native picker wrapped to match Dashboard's input aesthetic */
function PickerField({ label, value, onChange, items }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.pickerBox}>
        <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
          {items.map((it) => (
            <Picker.Item key={it.value} label={it.label} value={it.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

/** Ledger row — timeline-inspired card */
function LedgerCard({ item, onPress, canManage }) {
  const modeColor = TONE_MAP.info;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ledgerCard,
        { opacity: pressed && canManage ? 0.88 : 1, transform: [{ scale: pressed && canManage ? 0.99 : 1 }] },
      ]}
    >
      {/* left accent stripe */}
      <View style={[styles.ledgerStripe, { backgroundColor: PALETTE.emerald }]} />

      <View style={styles.ledgerBody}>
        <View style={styles.ledgerTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.ledgerTitle} numberOfLines={1}>
              {item.block} {item.flat}
            </Text>
            <Text style={styles.ledgerMeta} numberOfLines={1}>
              {item.tenant_name || 'Resident'} · {formatLedgerDate(item.payment_date)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ledgerAmount}>{formatAmount(item.amount)}</Text>
            <Text style={styles.ledgerBalance}>Running {formatAmount(item.running_balance)}</Text>
          </View>
        </View>

        <View style={styles.ledgerBottomRow}>
          <Pill label={(item.mode_of_payment || 'MODE').toUpperCase()} tone="info" icon="bank-outline" />
          <Pill label={item.status || 'DONE'} tone="success" icon="check-circle-outline" />
          {item.notes ? (
            <Text style={styles.ledgerNotes} numberOfLines={1}>{item.notes}</Text>
          ) : null}
          {canManage ? (
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color={PALETTE.inkTertiary}
              style={{ marginLeft: 'auto' }}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const route = useRoute();
  const now = new Date();

  const [filters, setFilters] = useState({
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    block: 'ALL',
    flat: '',
    payment_date: '',
    scope: 'month',
  });
  const [showDate, setShowDate] = useState(false);
  const [data, setData] = useState({ entries: [], total_amount: 0, count: 0, grand_total: 0, months: [] });
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (String(v || '').trim()) p.append(k, String(v));
    });
    return `/api/payments?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(query);
      setData(res.data || { entries: [], total_amount: 0, count: 0, grand_total: 0, months: [] });
    } catch {
      setData({ entries: [], total_amount: 0, count: 0, grand_total: 0, months: [] });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      const preset = route.params?.preset;
      if (preset) {
        setFilters((prev) => ({
          ...prev,
          scope: preset.scope || prev.scope,
          year: preset.year ? String(preset.year) : prev.year,
          month: preset.month ? String(preset.month) : prev.month,
          payment_date: preset.scope === 'today' ? toIsoDate(new Date()) : '',
        }));
        navigation.setParams({ preset: undefined });
      }
      load();
    }, [load, navigation, route.params?.preset, route.params?.ts]),
  );

  const entries = data.entries || [];

  const runningLedger = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      new Date(a.payment_date || 0).getTime() - new Date(b.payment_date || 0).getTime(),
    );
    let balance = 0;
    return sorted.map((item) => {
      balance += Number(item.amount || 0);
      return { ...item, running_balance: balance };
    }).reverse();
  }, [entries]);

  const grouped = useMemo(() => {
    const map = new Map();
    runningLedger.forEach((item) => {
      const key = `${item.year || 0}-${String(item.month || 0).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [runningLedger]);

  const metrics = useMemo(() => {
    const total = Number(data.total_amount || 0);
    const count = Number(data.count || 0);
    return [
      { label: 'Ledger total',    value: formatAmount(total),                            hint: `${count} filtered receipts`,   icon: 'cash-multiple',   tone: 'success' },
      { label: 'Grand total',     value: formatAmount(data.grand_total || 0),            hint: 'All-time collection',           icon: 'wallet-outline',  tone: 'accent'  },
      { label: 'Avg receipt',     value: formatAmount(count ? total / count : 0),        hint: 'Current filter set',            icon: 'chart-line',      tone: 'default' },
      { label: 'Latest balance',  value: formatAmount(runningLedger[0]?.running_balance || 0), hint: 'Running ledger snapshot', icon: 'scale-balance',   tone: 'warning' },
    ];
  }, [data.count, data.grand_total, data.total_amount, runningLedger]);

  const exportLedger = useCallback(async () => {
    const csv = buildCsv(entries);
    await Share.share({ title: 'Society payments ledger', message: csv });
  }, [entries]);

  const resetFilters = useCallback(() => {
    setFilters({
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
      block: 'ALL',
      flat: '',
      payment_date: '',
      scope: 'month',
    });
  }, [now]);

  return (
    <Page style={{ backgroundColor: PALETTE.bg }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <Surface style={styles.heroCard}>
        {/* decorative blobs */}
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Pill label="FUND LEDGER" tone="info" icon="book-open-page-variant-outline" />
            <Text style={styles.heroTitle}>Payments hub</Text>
            <Text style={styles.heroSubtitle}>
              Filter by date, block, or flat. Review receipts, track balances, and export the current ledger view.
            </Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable
              onPress={exportLedger}
              style={({ pressed }) => [
                styles.iconButton,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <MaterialCommunityIcons name="export" size={20} color={PALETTE.ink} />
            </Pressable>
            {canManage ? (
              <Pressable
                onPress={() => navigation.navigate('NewPayment')}
                style={({ pressed }) => [
                  styles.addButton,
                  { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
                ]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* summary bar */}
        <View style={styles.heroSummaryBar}>
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryLabel}>TOTAL COLLECTED</Text>
            <Text style={styles.heroSummaryValue}>{formatAmount(data.total_amount || 0)}</Text>
          </View>
          <View style={styles.heroSummaryDivider} />
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryLabel}>RECEIPTS</Text>
            <Text style={styles.heroSummaryValue}>{data.count || 0}</Text>
          </View>
          <View style={styles.heroSummaryDivider} />
          <View style={styles.heroSummaryItem}>
            <Text style={styles.heroSummaryLabel}>ALL-TIME</Text>
            <Text style={styles.heroSummaryValue}>{formatAmount(data.grand_total || 0)}</Text>
          </View>
        </View>
      </Surface>

      {/* ── Stat grid ──────────────────────────────────────────────────────── */}
      <View style={styles.statGrid}>
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </View>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Surface>
        <SectionHeader title="Smart filters" subtitle="Filter by scope, date, block, or flat." />

        <View style={styles.filterCard}>
          {/* Scope pill row */}
          <View style={styles.scopeRow}>
            {['today', 'month', 'year', 'all'].map((s) => (
              <Pressable
                key={s}
                onPress={() => setFilters((p) => ({ ...p, scope: s }))}
                style={({ pressed }) => [
                  styles.scopeBtn,
                  {
                    backgroundColor: filters.scope === s ? PALETTE.blue : PALETTE.surface,
                    borderColor: filters.scope === s ? PALETTE.blue : PALETTE.border,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.scopeTxt, { color: filters.scope === s ? '#fff' : PALETTE.inkSecondary }]}>
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Year"
                value={filters.year}
                onChange={(v) => setFilters((p) => ({ ...p, year: String(v) }))}
                items={YEARS.map((y) => ({ label: y, value: y }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Month"
                value={filters.month}
                onChange={(v) => setFilters((p) => ({ ...p, month: String(v) }))}
                items={MONTH_NAMES.map((m, i) => ({ label: m, value: String(i + 1) }))}
              />
            </View>
          </View>

          <PickerField
            label="Block"
            value={filters.block}
            onChange={(v) => setFilters((p) => ({ ...p, block: v }))}
            items={BLOCKS.map((b) => ({ label: b, value: b }))}
          />

          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Flat</Text>
              <TextInput
                style={styles.input}
                value={filters.flat}
                onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))}
                placeholder="e.g. 101"
                placeholderTextColor={PALETTE.inkTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterLabel}>Date</Text>
              <Pressable
                style={({ pressed }) => [styles.input, styles.dateInput, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setShowDate(true)}
              >
                <MaterialCommunityIcons name="calendar-outline" size={16} color={PALETTE.inkSecondary} />
                <Text style={[styles.dateInputText, { color: filters.payment_date ? PALETTE.ink : PALETTE.inkTertiary }]}>
                  {filters.payment_date || 'Select date'}
                </Text>
              </Pressable>
            </View>
          </View>

          {showDate && (
            <DateTimePicker
              value={safeDateFromIso(filters.payment_date || toIsoDate(new Date()))}
              mode="date"
              display="default"
              onChange={(event, d) => {
                if (event.type === 'dismissed') { setShowDate(false); return; }
                if (d) setFilters((p) => ({ ...p, payment_date: toIsoDate(d) }));
                setShowDate(false);
              }}
            />
          )}

          <Pressable
            onPress={load}
            style={({ pressed }) => [
              styles.applyBtn,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <MaterialCommunityIcons name="filter-check" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.applyBtnText}>{loading ? 'Loading…' : 'Apply filters'}</Text>
          </Pressable>
        </View>
      </Surface>

      {/* ── Ledger ─────────────────────────────────────────────────────────── */}
      <Surface>
        <SectionHeader
          title="Ledger view"
          subtitle={`${data.count || 0} receipts · ${formatAmount(data.total_amount || 0)}`}
          actionLabel="Export"
          onAction={exportLedger}
        />

        {grouped.length > 0 ? (
          <View style={styles.groupList}>
            {grouped.map(([groupKey, groupItems]) => {
              const [year, month] = groupKey.split('-');
              const groupTotal = groupItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
              return (
                <View key={groupKey} style={styles.groupBlock}>
                  {/* group header */}
                  <View style={styles.groupHeader}>
                    <View style={[styles.groupIconWrap, { backgroundColor: PALETTE.blueSoft }]}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={16} color={PALETTE.blue} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.groupTitle}>
                        {MONTH_NAMES[Number(month) - 1]} {year}
                      </Text>
                      <Text style={styles.groupSubtitle}>
                        {groupItems.length} receipt{groupItems.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Pill label={formatAmount(groupTotal)} tone="info" />
                  </View>

                  <View style={styles.ledgerList}>
                    {groupItems.map((item) => (
                      <LedgerCard
                        key={String(item.payment_id)}
                        item={item}
                        canManage={canManage}
                        onPress={() =>
                          canManage &&
                          navigation.navigate('EditPayment', { payment: item, onSaved: load })
                        }
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : loading ? (
          <EmptyState
            title="Loading ledger"
            subtitle="Fetching the filtered payments ledger."
            icon="progress-clock"
          />
        ) : (
          <EmptyState
            title="No matching payments"
            subtitle="Adjust the filters or clear the current scope to see matching receipts."
            icon="cash-remove"
            actionLabel="Reset filters"
            onAction={resetFilters}
          />
        )}
      </Surface>
    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Surface ───────────────────────────────────────────────────────────────
  surface: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: PALETTE.blueSoft,
    top: -60,
    right: -60,
    opacity: 0.6,
  },
  blobB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: PALETTE.indigoSoft,
    bottom: -40,
    left: -30,
    opacity: 0.5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: PALETTE.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSummaryBar: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  heroSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroSummaryDivider: {
    width: 1,
    backgroundColor: PALETTE.border,
    marginHorizontal: 4,
  },
  heroSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroSummaryValue: {
    fontSize: 15,
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },

  // ── Pill ──────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    lineHeight: 18,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Stat grid ─────────────────────────────────────────────────────────────
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Filters ───────────────────────────────────────────────────────────────
  filterCard: {
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrap: {
    gap: 4,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pickerBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surfaceMuted,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surfaceMuted,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.ink,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInputText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scopeBtn: {
    borderWidth: 1.5,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  scopeTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.blue,
    borderRadius: RADIUS.lg,
    minHeight: 50,
    marginTop: 4,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ── Group / Ledger ────────────────────────────────────────────────────────
  groupList: {
    gap: 16,
  },
  groupBlock: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.borderSoft,
  },
  groupIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  groupSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.inkSecondary,
  },
  ledgerList: {
    gap: 10,
  },
  ledgerCard: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  ledgerStripe: {
    width: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
  },
  ledgerBody: {
    flex: 1,
    padding: 14,
  },
  ledgerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  ledgerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.2,
  },
  ledgerMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  ledgerBalance: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.inkTertiary,
  },
  ledgerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  ledgerNotes: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    minWidth: 0,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: 8,
    backgroundColor: PALETTE.blueSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: PALETTE.blue,
    letterSpacing: 0.2,
  },
});