import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

// ─── Design tokens ────────────────────────────────────────────────────────────

const P = {
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',
  surfacePress: '#F8F9FF',

  ink:          '#0D0F14',
  inkSub:       '#5A6375',
  inkMuted:     '#9BA3B4',

  brand:        '#1A56DB',
  brandSoft:    '#EEF4FF',
  brandMid:     '#C7D8FF',

  emerald:      '#0B8A5E',
  emeraldSoft:  '#ECFDF5',
  emeraldMid:   '#A7F3D0',

  rose:         '#C81E45',
  roseSoft:     '#FFF1F2',
  roseMid:      '#FECDD3',

  amber:        '#C07A10',
  amberSoft:    '#FFFBEB',
  amberMid:     '#FDE68A',

  violet:       '#6D28D9',
  violetSoft:   '#F5F3FF',
  violetMid:    '#DDD6FE',

  border:       '#E8EAF0',
  borderSubtle: '#F1F3F8',
};

const SHADOW_SM = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6  },
  android: { elevation: 1 },
  default: {},
});

const SHADOW_MD = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
  android: { elevation: 2 },
  default: {},
});

const SHADOW_LG = Platform.select({
  ios:     { shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 20 },
  android: { elevation: 4 },
  default: {},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value) {
  const n = Math.round(value || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatDate(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return raw; }
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ title, count }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
      {typeof count === 'number' && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, fg, bg, ring, isBalance }) {
  return (
    <View style={[styles.statCard, { borderColor: ring }, isBalance && styles.statCardBalance]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg, borderColor: ring }]}>
        <MaterialCommunityIcons name={icon} size={16} color={fg} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
    </View>
  );
}

// ─── ExpenseRow ───────────────────────────────────────────────────────────────

function ExpenseRow({ item, onPress, isLast, index }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  const amount = Math.round(item.amount || 0);
  const isLarge = amount >= 10000;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.expenseRow, !isLast && styles.expenseRowDivider]}
      >
        {/* Index dot */}
        <View style={styles.rowIndex}>
          <Text style={styles.rowIndexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>

        {/* Content */}
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.item_name}</Text>
          <View style={styles.rowMetaRow}>
            <MaterialCommunityIcons name="calendar-outline" size={11} color={P.inkMuted} />
            <Text style={styles.rowDate}>{formatDate(item.transaction_date)}</Text>
            {item.category ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.rowCategory}>{item.category}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.rowRight}>
          <Text style={[styles.rowAmount, isLarge && { color: P.rose }]}>
            {fmt(amount)}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={P.inkMuted} style={{ marginTop: 2 }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ searching }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons
          name={searching ? 'magnify-close' : 'receipt-text-outline'}
          size={22}
          color={P.brand}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {searching ? 'No results found' : 'No expenses yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {searching
          ? 'Try a different search term.'
          : 'Add your first expense to start tracking.'}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { user } = useAuth();
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const canManage   = String(user?.role || '').toUpperCase() === 'ADMIN';

  const [rows,       setRows]       = useState([]);
  const [summary,    setSummary]    = useState({ total_collection: 0, total_expense: 0, balance: 0 });
  const [item,       setItem]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const query = useMemo(() => `/api/expenses?item=${encodeURIComponent(item)}`, [item]);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await apiRequest(query);
      setRows(res.data || []);
      setSummary(res.summary || { total_collection: 0, total_expense: 0, balance: 0 });
    } catch {
      setRows([]);
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const balancePositive = (summary.balance || 0) >= 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={P.brand}
          colors={[P.brand]}
        />
      }
    >

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Finance</Text>
          <Text style={styles.headerTitle}>Expenses</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={P.inkSub} />
          </Pressable>
          {canManage && (
            <Pressable
              onPress={() => navigation.navigate('NewExpense', { onSaved: load })}
              style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          label="Collection"
          value={fmt(summary.total_collection)}
          icon="bank-outline"
          fg={P.brand}
          bg={P.brandSoft}
          ring={P.brandMid}
        />
        <StatCard
          label="Expense"
          value={fmt(summary.total_expense)}
          icon="arrow-top-right-bold-outline"
          fg={P.rose}
          bg={P.roseSoft}
          ring={P.roseMid}
        />
        <StatCard
          label="Balance"
          value={fmt(summary.balance)}
          icon={balancePositive ? 'trending-up' : 'trending-down'}
          fg={balancePositive ? P.emerald : P.rose}
          bg={balancePositive ? P.emeraldSoft : P.roseSoft}
          ring={balancePositive ? P.emeraldMid : P.roseMid}
          isBalance
        />
      </View>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.searchCard}>
          <View style={styles.searchIconWrap}>
            <MaterialCommunityIcons name="magnify" size={17} color={P.inkMuted} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by item name…"
            placeholderTextColor={P.inkMuted}
            value={item}
            onChangeText={setItem}
            onSubmitEditing={() => load()}
            returnKeyType="search"
          />
          {item.length > 0 && (
            <Pressable onPress={() => setItem('')} style={styles.searchClear}>
              <MaterialCommunityIcons name="close-circle" size={16} color={P.inkMuted} />
            </Pressable>
          )}
          <Pressable
            onPress={() => load()}
            style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Expense list ────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Transactions" count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState searching={item.length > 0} />
        ) : (
          <View style={styles.listCard}>
            {rows.map((exp, idx) => (
              <ExpenseRow
                key={String(exp.id)}
                item={exp}
                index={idx}
                isLast={idx === rows.length - 1}
                onPress={() => canManage && navigation.navigate('EditExpense', { expense: exp, onSaved: load })}
              />
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: P.bg,
  },
  content: {
    paddingHorizontal: 16,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.brand,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: P.ink,
    lineHeight: 34,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_LG,
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    ...SHADOW_MD,
  },
  statCardBalance: {
    // intentionally same; accent via border color passed inline
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.inkMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: P.ink,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: P.inkSub,
  },
  sectionBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.brand,
  },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    ...SHADOW_SM,
  },
  searchIconWrap: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: P.ink,
    paddingVertical: 2,
  },
  searchClear: {
    flexShrink: 0,
    padding: 2,
  },
  searchBtn: {
    backgroundColor: P.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  searchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── List card ────────────────────────────────────────────────────────────────
  listCard: {
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    ...SHADOW_MD,
  },

  // ── Expense row ──────────────────────────────────────────────────────────────
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    backgroundColor: P.surface,
  },
  expenseRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderSubtle,
  },
  rowIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: P.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.inkMuted,
    letterSpacing: 0.3,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.ink,
    letterSpacing: -0.1,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: P.inkMuted,
  },
  rowCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: P.inkMuted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: P.ink,
    letterSpacing: -0.3,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 6,
    ...SHADOW_SM,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: P.inkSub,
    textAlign: 'center',
  },
});