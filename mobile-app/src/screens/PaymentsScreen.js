import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { MONTH_NAMES, safeDateFromIso, toIsoDate } from '../lib/date';
import { useAuth } from '../lib/auth';
import { colors, radius, ui } from '../lib/theme';

const YEARS = Array.from({ length: new Date().getFullYear() - 2024 }, (_, i) => String(2025 + i));
const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

function PickerField({ label, value, onChange, items, borderColor }) {
  return <View style={styles.fieldWrap}><Text style={styles.filterLabel}>{label}</Text><View style={[styles.pickerBox, { borderColor }]}><Picker selectedValue={value} onValueChange={onChange} style={styles.picker}>{items.map((it) => <Picker.Item key={it.value} label={it.label} value={it.value} />)}</Picker></View></View>;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const navigation = useNavigation();
  const route = useRoute();
  const now = new Date();
  const [filters, setFilters] = useState({ year: String(now.getFullYear()), month: String(now.getMonth() + 1), block: 'ALL', flat: '', payment_date: '', scope: 'month' });
  const [showDate, setShowDate] = useState(false);
  const [data, setData] = useState({ entries: [], total_amount: 0, count: 0 });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (String(v || '').trim()) p.append(k, String(v)); });
    return `/api/payments?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    const res = await apiRequest(query);
    setData(res.data);
  }, [query]);

  useFocusEffect(useCallback(() => {
    const preset = route.params?.preset;
    if (preset) {
      setFilters((prev) => ({ ...prev, scope: preset.scope || prev.scope, year: preset.year ? String(preset.year) : prev.year, month: preset.month ? String(preset.month) : prev.month, payment_date: preset.scope === 'today' ? toIsoDate(new Date()) : '' }));
      navigation.setParams({ preset: undefined });
    }
    load();
  }, [load, route.params?.ts]));

  return (
    <Page>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Payments</Text>
        <View style={styles.headerActions}>
          {canManage ? (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewPayment')}>
              <View style={styles.inlineIcon}><MaterialCommunityIcons name="plus-circle-outline" size={16} color="#fff" /><Text style={styles.addButtonText}>Add Payment</Text></View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.filterCard}>
        <PickerField label="Year" value={filters.year} onChange={(v) => setFilters((p) => ({ ...p, year: String(v) }))} borderColor="#4f81c8" items={YEARS.map((y) => ({ label: y, value: y }))} />
        <PickerField label="Month" value={filters.month} onChange={(v) => setFilters((p) => ({ ...p, month: String(v) }))} borderColor="#58ad77" items={MONTH_NAMES.map((m, i) => ({ label: m, value: String(i + 1) }))} />
        <PickerField label="Block" value={filters.block} onChange={(v) => setFilters((p) => ({ ...p, block: v }))} borderColor="#f09a45" items={BLOCKS.map((b) => ({ label: b, value: b }))} />
        <Text style={styles.filterLabel}>Flat</Text><TextInput style={styles.input} value={filters.flat} onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))} placeholder="e.g. 101" />
        <Text style={styles.filterLabel}>Date</Text><TouchableOpacity style={styles.input} onPress={() => setShowDate(true)}><Text>{filters.payment_date || 'Select Date'}</Text></TouchableOpacity>
        {showDate && <DateTimePicker value={safeDateFromIso(filters.payment_date || toIsoDate(new Date()))} mode="date" display="default" onChange={(event, d) => { if (event.type === 'dismissed') { setShowDate(false); return; } if (d) setFilters((p) => ({ ...p, payment_date: toIsoDate(d) })); setShowDate(false); }} />}
        <View style={styles.scopeRow}>{['today', 'month', 'year', 'all'].map((s) => <TouchableOpacity key={s} style={[styles.scopeBtn, filters.scope === s && styles.scopeBtnActive]} onPress={() => setFilters((p) => ({ ...p, scope: s }))}><Text style={[styles.scopeTxt, filters.scope === s && styles.scopeTxtActive]}>{s.toUpperCase()}</Text></TouchableOpacity>)}</View>
        <TouchableOpacity style={styles.applyBtn} onPress={load}><Text style={styles.applyBtnText}>Apply Filter</Text></TouchableOpacity>
      </View>
      <Text style={styles.meta}>Count: {data.count || 0} | Total: Rs {Math.round(data.total_amount || 0)}</Text>
      {(data.entries || []).map((item) => (
        <TouchableOpacity key={String(item.payment_id)} style={styles.row} onPress={() => navigation.navigate('EditPayment', { payment: item, onSaved: load })}>
          <Text style={styles.rowTitle}>{item.block} | {item.flat}</Text>
          <Text style={styles.rowMeta}>{MONTH_NAMES[(item.month || 1) - 1]} {item.year} | Rs {Math.round(item.amount)} | {item.payment_date || '-'}</Text>
          <Text style={styles.rowMeta}>Tenant: {item.tenant_name || 'NA'}</Text>
        </TouchableOpacity>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerActions: { flexDirection: 'row', gap: 8 },
  title: { ...ui.title, marginBottom: 0 },
  addButton: ui.primaryButton,
  inlineIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addButtonText: ui.primaryButtonText,
  filterCard: { ...ui.card, marginBottom: 10 },
  fieldWrap: { marginTop: 4 },
  filterLabel: { color: colors.muted, marginBottom: 4, marginTop: 4, fontWeight: '700' },
  pickerBox: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1 },
  picker: { height: 48 },
  input: { ...ui.input, justifyContent: 'center' },
  applyBtn: { ...ui.primaryButton, marginTop: 10 },
  applyBtnText: { ...ui.primaryButtonText, textAlign: 'center' },
  meta: { color: colors.muted, marginBottom: 8, fontWeight: '700' },
  row: { ...ui.row, borderLeftWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowMeta: { color: colors.muted, marginTop: 4 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  scopeBtn: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.surface },
  scopeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopeTxt: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  scopeTxtActive: { color: '#fff' },
});
