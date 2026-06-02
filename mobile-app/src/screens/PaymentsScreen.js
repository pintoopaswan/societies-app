import React, { useCallback, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import {
  Badge,
  EmptyState,
  ProgressBar,
  SectionHeader,
  Sparkline,
  StatCard,
  Surface,
} from '../components/DesignSystem';
import { apiRequest } from '../lib/api';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';
import { useAuth } from '../lib/auth';
import { radius, useAppTheme } from '../lib/theme';

const YEARS = Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => String(2025 + i));
const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

function PickerField({ label, value, onChange, items }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.filterLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.pickerBox, { borderColor: colors.border }]}>
        <Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>
          {items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} />)}
        </Picker>
      </View>
    </View>
  );
}

function formatAmount(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
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
  const rows = entries.map((item) => header.map((key) => {
    const raw = item[key];
    const safe = String(raw == null ? '' : raw).replaceAll('"', '""');
    return `"${safe}"`;
  }).join(','));
  return [header.join(','), ...rows].join('\n');
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const { colors: themeColors } = useAppTheme();
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
    } catch (e) {
      setData({ entries: [], total_amount: 0, count: 0, grand_total: 0, months: [] });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useFocusEffect(useCallback(() => {
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
  }, [load, navigation, route.params?.preset, route.params?.ts]));

  const entries = data.entries || [];
  const runningLedger = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const ad = new Date(a.payment_date || 0).getTime();
      const bd = new Date(b.payment_date || 0).getTime();
      return ad - bd;
    });
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
      { label: 'Ledger total', value: formatAmount(total), hint: `${count} filtered receipts`, icon: 'cash-multiple', tone: 'success' },
      { label: 'Grand total', value: formatAmount(data.grand_total || 0), hint: 'All-time collection', icon: 'wallet-outline', tone: 'accent' },
      { label: 'Average receipt', value: formatAmount(count ? total / count : 0), hint: 'Current filter set', icon: 'chart-line', tone: 'default' },
      { label: 'Latest balance', value: formatAmount(runningLedger[0]?.running_balance || 0), hint: 'Running ledger snapshot', icon: 'scale-balance', tone: 'warning' },
    ];
  }, [data.count, data.grand_total, data.total_amount, runningLedger]);

  const exportLedger = useCallback(async () => {
    const csv = buildCsv(entries);
    await Share.share({
      title: 'Society payments ledger',
      message: csv,
    });
  }, [entries]);

  return (
    <Page>
      <Surface style={[styles.hero, { backgroundColor: themeColors.surface }]}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Badge label="FUND LEDGER" tone="info" />
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>A refined payments hub</Text>
            <Text style={[styles.heroSubtitle, { color: themeColors.muted }]}>
              Filter by date, block, or flat. Review receipts, track balances, and export the current ledger view.
            </Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: themeColors.surfaceSoft, borderColor: themeColors.border }]} onPress={exportLedger}>
              <MaterialCommunityIcons name="export" size={20} color={themeColors.text} />
            </TouchableOpacity>
            {canManage ? (
              <TouchableOpacity style={[styles.addButton, { backgroundColor: themeColors.primary }] } onPress={() => navigation.navigate('NewPayment')}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.heroSparkWrap}>
          <Sparkline values={(data.months || []).slice(0, 12).map((_, idx) => (runningLedger[idx]?.amount || 0))} color={themeColors.primaryBlue} />
        </View>
      </Surface>

      <View style={styles.statGrid}>
        {metrics.map((item) => <StatCard key={item.label} {...item} />)}
      </View>

      <Surface>
        <SectionHeader title="Smart filters" subtitle="One-handed filters for speed, plus date and scope presets." />
        <View style={styles.filterCard}>
          <PickerField label="Year" value={filters.year} onChange={(v) => setFilters((p) => ({ ...p, year: String(v) }))} items={YEARS.map((y) => ({ label: y, value: y }))} />
          <PickerField label="Month" value={filters.month} onChange={(v) => setFilters((p) => ({ ...p, month: String(v) }))} items={MONTH_NAMES.map((m, i) => ({ label: m, value: String(i + 1) }))} />
          <PickerField label="Block" value={filters.block} onChange={(v) => setFilters((p) => ({ ...p, block: v }))} items={BLOCKS.map((b) => ({ label: b, value: b }))} />
          <Text style={[styles.filterLabel, { color: themeColors.muted }]}>Flat</Text>
          <TextInput
            style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }]}
            value={filters.flat}
            onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))}
            placeholder="e.g. 101"
            placeholderTextColor={themeColors.muted}
          />
          <Text style={[styles.filterLabel, { color: themeColors.muted }]}>Date</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]} onPress={() => setShowDate(true)}>
            <Text style={{ color: filters.payment_date ? themeColors.text : themeColors.muted }}>{filters.payment_date || 'Select Date'}</Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker
              value={safeDateFromIso(filters.payment_date || toIsoDate(new Date()))}
              mode="date"
              display="default"
              onChange={(event, d) => {
                if (event.type === 'dismissed') {
                  setShowDate(false);
                  return;
                }
                if (d) setFilters((p) => ({ ...p, payment_date: toIsoDate(d) }));
                setShowDate(false);
              }}
            />
          )}
          <View style={styles.scopeRow}>
            {['today', 'month', 'year', 'all'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.scopeBtn,
                  {
                    backgroundColor: filters.scope === s ? themeColors.primary : themeColors.surface,
                    borderColor: filters.scope === s ? themeColors.primary : themeColors.borderStrong,
                  },
                ]}
                onPress={() => setFilters((p) => ({ ...p, scope: s }))}
              >
                <Text style={[styles.scopeTxt, { color: filters.scope === s ? '#fff' : themeColors.muted }]}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: themeColors.primary }]} onPress={load}>
            <Text style={styles.applyBtnText}>{loading ? 'Loading...' : 'Apply filters'}</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <Surface>
        <SectionHeader title="Ledger view" subtitle={`Count ${data.count || 0}  |  Total ${formatAmount(data.total_amount || 0)}`} actionLabel="Share ledger" onAction={exportLedger} />
        {grouped.length > 0 ? (
          <View style={styles.groupList}>
            {grouped.map(([groupKey, groupItems]) => {
              const [year, month] = groupKey.split('-');
              const groupTotal = groupItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
              return (
                <View key={groupKey} style={styles.groupBlock}>
                  <View style={[styles.groupHeader, { borderBottomColor: themeColors.border }]}>
                    <View>
                      <Text style={[styles.groupTitle, { color: themeColors.text }]}>{MONTH_NAMES[Number(month) - 1]} {year}</Text>
                      <Text style={[styles.groupSubtitle, { color: themeColors.muted }]}>{groupItems.length} receipt{groupItems.length === 1 ? '' : 's'}</Text>
                    </View>
                    <Badge label={formatAmount(groupTotal)} tone="info" />
                  </View>
                  <View style={styles.ledgerList}>
                    {groupItems.map((item) => (
                      <TouchableOpacity
                        key={String(item.payment_id)}
                        style={[styles.ledgerCard, { backgroundColor: themeColors.surfaceSoft, borderColor: themeColors.border }]}
                        onPress={() => canManage && navigation.navigate('EditPayment', { payment: item, onSaved: load })}
                        activeOpacity={canManage ? 0.85 : 1}
                      >
                        <View style={styles.ledgerTopRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.ledgerTitle, { color: themeColors.text }]} numberOfLines={1}>{item.block} {item.flat}</Text>
                            <Text style={[styles.ledgerMeta, { color: themeColors.muted }]} numberOfLines={1}>
                              {item.tenant_name || 'Resident'} • {formatLedgerDate(item.payment_date)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.ledgerAmount, { color: themeColors.text }]}>{formatAmount(item.amount)}</Text>
                            <Text style={[styles.ledgerBalance, { color: themeColors.muted }]}>Running {formatAmount(item.running_balance)}</Text>
                          </View>
                        </View>
                        <View style={styles.ledgerBottomRow}>
                          <Badge label={(item.mode_of_payment || 'MODE').toUpperCase()} tone="neutral" />
                          <Badge label={item.status || 'DONE'} tone="success" />
                          {item.notes ? <Text style={[styles.ledgerNotes, { color: themeColors.muted }]} numberOfLines={1}>{item.notes}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : loading ? (
          <EmptyState title="Loading ledger" subtitle="Fetching the filtered payments ledger." icon="progress-clock" />
        ) : (
          <EmptyState
            title="No matching payments"
            subtitle="Adjust the filters or clear the current scope to see matching receipts."
            icon="cash-remove"
            actionLabel="Reset"
            onAction={() => {
              const next = {
                year: String(now.getFullYear()),
                month: String(now.getMonth() + 1),
                block: 'ALL',
                flat: '',
                payment_date: '',
                scope: 'month',
              };
              setFilters(next);
            }}
          />
        )}
      </Surface>
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: 18,
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
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSparkWrap: {
    marginTop: 8,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterCard: {
    gap: 4,
  },
  fieldWrap: {
    marginTop: 4,
  },
  filterLabel: {
    marginBottom: 4,
    marginTop: 4,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pickerBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  scopeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  scopeTxt: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  applyBtn: {
    borderRadius: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  groupList: {
    gap: 12,
  },
  groupBlock: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  groupSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  ledgerList: {
    gap: 10,
  },
  ledgerCard: {
    borderRadius: 20,
    borderWidth: 1,
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
    fontWeight: '900',
  },
  ledgerMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  ledgerBalance: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '600',
    minWidth: 0,
  },
});
