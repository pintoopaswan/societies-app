import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function PaymentsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, token } = useAuth();
  const { colors, radius } = useAppTheme();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  const now = new Date();
  const [filters, setFilters] = useState({
    scope: 'month',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    block: 'ALL',
    flat: '',
  });

  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.append(k, String(v)); });
    return `/api/payments?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest(query, {}, token);
      setData(res.data || null);
    } catch {
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, [query, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Page
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Payment Ledger</Text>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('NewPayment')}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <Surface style={styles.filterCard}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1.2 }}>
            <Text style={[styles.filterLabel, { color: colors.muted }]}>Period</Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
              <Picker
                selectedValue={filters.month}
                onValueChange={(v) => setFilters(p => ({ ...p, month: v }))}
                style={styles.picker}
              >
                {MONTHS.map((m, i) => <Picker.Item key={m} label={m} value={i + 1} />)}
              </Picker>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.filterLabel, { color: colors.muted }]}>Block</Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
              <Picker
                selectedValue={filters.block}
                onValueChange={(v) => setFilters(p => ({ ...p, block: v }))}
                style={styles.picker}
              >
                {BLOCKS.map(b => <Picker.Item key={b} label={b} value={b} />)}
              </Picker>
            </View>
          </View>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
          placeholder="Search flat number..."
          placeholderTextColor={colors.muted}
          value={filters.flat}
          onChangeText={(v) => setFilters(p => ({ ...p, flat: v }))}
        />
      </Surface>

      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{data?.count || 0}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Receipts</Text>
        </Surface>
        <Surface style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
          <Text style={[styles.summaryVal, { color: colors.text }]}>{fmtAmount(data?.total_amount || 0)}</Text>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Collection</Text>
        </Surface>
      </View>

      <View style={styles.results}>
        <SectionHeader title="Receipts" subtitle={`${MONTHS[filters.month-1]} ${filters.year}`} />
        {(!data?.entries || data.entries.length === 0) ? (
          <EmptyState
            icon="receipt-text-outline"
            title="No records found"
            subtitle="Try changing the period or filters."
          />
        ) : (
          <Surface style={{ padding: 0 }}>
            {data.entries.map((item, idx) => (
              <ActivityRow
                key={item.payment_id}
                title={`${item.block} · ${item.flat}`}
                subtitle={`${item.mode_of_payment} · ${fmtAmount(item.amount)}`}
                time={item.payment_date}
                icon="cash-check"
                tone="payment"
                isLast={idx === data.entries.length - 1}
                onPress={() => navigation.navigate('EditPayment', { payment: item, onSaved: load })}
              />
            ))}
          </Surface>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 2 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  filterCard: { padding: 16, gap: 12, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  pickerBox: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  picker: { height: 48 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 15, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 14, gap: 2 },
  summaryVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  summaryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  results: { marginTop: 4 },
});
