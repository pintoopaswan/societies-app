import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
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

// ─── Design tokens (mirrors DashboardScreen) ──────────────────────────────────

const PALETTE = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
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
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge — identical to Dashboard's Pill */
function Pill({ label, color = PALETTE.blue, bg = PALETTE.blueSoft, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={11} color={color} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Section header — matches Dashboard's SectionHeader */
function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
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

/** Single filter input field with label */
function FilterField({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.filterLabel}>{label}</Text>
      {children}
    </View>
  );
}

/** Owner row card — timeline-inspired with left accent stripe */
function OwnerCard({ item, isPriority, onPress }) {
  const stripeColor = isPriority ? PALETTE.emerald : PALETTE.blue;
  const occupied = item.is_occupied;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerCard,
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      {/* left accent stripe */}
      <View style={[styles.ownerStripe, { backgroundColor: stripeColor }]} />

      <View style={styles.ownerBody}>
        {/* top row: flat + occupancy badge */}
        <View style={styles.ownerTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.ownerTitle} numberOfLines={1}>
              {item.block}  ·  {item.flat}
            </Text>
            {isPriority && (
              <Text style={styles.ownerPriorityHint}>Highlighted result</Text>
            )}
          </View>
          <Pill
            label={occupied ? 'Occupied' : 'Vacant'}
            color={occupied ? PALETTE.emerald : PALETTE.amber}
            bg={occupied ? PALETTE.emeraldSoft : PALETTE.amberSoft}
            icon={occupied ? 'home-check-outline' : 'home-outline'}
          />
        </View>

        {/* meta row */}
        <View style={styles.ownerMetaRow}>
          <View style={styles.ownerMetaItem}>
            <MaterialCommunityIcons name="account-tie-outline" size={14} color={PALETTE.inkTertiary} />
            <Text style={styles.ownerMetaText} numberOfLines={1}>
              {item.owner_name || 'Name not set'}
            </Text>
          </View>
          <View style={styles.ownerMetaItem}>
            <MaterialCommunityIcons name="phone-outline" size={14} color={PALETTE.inkTertiary} />
            <Text style={styles.ownerMetaText} numberOfLines={1}>
              {item.owner_contact || 'Contact not set'}
            </Text>
          </View>
        </View>

        {/* footer */}
        <View style={styles.ownerFooter}>
          <Text style={styles.ownerViewMore}>View details</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={PALETTE.blue} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OwnersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const priorityPropertyId = route.params?.priorityPropertyId;

  const [filters, setFilters] = useState({ block: 'ALL', flat: '', owner: '', contact: '' });
  const [rows, setRows] = useState([]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if ((v || '').trim()) p.append(k, v);
    });
    return `/api/owners?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    const res = await apiRequest(query);
    const data = res.data || [];
    if (!priorityPropertyId) {
      setRows(data);
      return;
    }
    const targetId = String(priorityPropertyId);
    setRows([
      ...data.filter((item) => String(item.property_id) === targetId),
      ...data.filter((item) => String(item.property_id) !== targetId),
    ]);
  }, [priorityPropertyId, query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resultCount = rows.length;

  return (
    <Page style={{ backgroundColor: PALETTE.bg }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.heroPillsRow}>
          <Pill label="DIRECTORY" color={PALETTE.indigo} bg={PALETTE.indigoSoft} />
          <Pill label="Owners" color={PALETTE.blue} bg={PALETTE.blueSoft} icon="account-tie-outline" />
        </View>
        <Text style={styles.heroTitle}>Owner Details</Text>
        <Text style={styles.heroSubtitle}>
          Search and filter registered flat owners by block, flat number, name, or contact.
        </Text>
      </View>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Search filters" subtitle="Narrow results by any combination of fields." />

        <View style={styles.filterCard}>
          <FilterField label="Block">
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={filters.block}
                onValueChange={(v) => setFilters((p) => ({ ...p, block: v }))}
                style={styles.picker}
              >
                {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
              </Picker>
            </View>
          </FilterField>

          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <FilterField label="Flat number">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 101"
                  placeholderTextColor={PALETTE.inkTertiary}
                  value={filters.flat}
                  onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))}
                />
              </FilterField>
            </View>
            <View style={{ flex: 1 }}>
              <FilterField label="Owner name">
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sharma"
                  placeholderTextColor={PALETTE.inkTertiary}
                  value={filters.owner}
                  onChangeText={(v) => setFilters((p) => ({ ...p, owner: v }))}
                />
              </FilterField>
            </View>
          </View>

          <FilterField label="Contact number">
            <TextInput
              style={styles.input}
              placeholder="e.g. 98765…"
              placeholderTextColor={PALETTE.inkTertiary}
              value={filters.contact}
              onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))}
              keyboardType="phone-pad"
            />
          </FilterField>

          <Pressable
            onPress={load}
            style={({ pressed }) => [
              styles.searchBtn,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.searchBtnText}>Search owners</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Results"
          subtitle={resultCount > 0 ? `${resultCount} owner${resultCount === 1 ? '' : 's'} found` : 'No results yet'}
        />

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="account-search-outline" size={28} color={PALETTE.blue} />
            </View>
            <Text style={styles.emptyTitle}>No owners found</Text>
            <Text style={styles.emptyBody}>Adjust your filters and tap Search to find matching owners.</Text>
          </View>
        ) : (
          <View style={styles.resultList}>
            {rows.map((item) => (
              <OwnerCard
                key={String(item.property_id)}
                item={item}
                isPriority={String(item.property_id) === String(priorityPropertyId || '')}
                onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id })}
              />
            ))}
          </View>
        )}
      </View>

    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },
  blobA: {
    position: 'absolute',
    top: -50, right: -40,
    width: 180, height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(79, 70, 229, 0.07)',
  },
  blobB: {
    position: 'absolute',
    bottom: -60, left: -50,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Pill ──────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PALETTE.blueSoft,
    borderRadius: RADIUS.pill,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Filter card ───────────────────────────────────────────────────────────
  filterCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrap: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    fontSize: 14,
    fontWeight: '600',
    color: PALETTE.ink,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.blue,
    borderRadius: RADIUS.lg,
    minHeight: 50,
    marginTop: 4,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ── Result list ───────────────────────────────────────────────────────────
  resultList: {
    gap: 10,
  },

  // ── Owner card ────────────────────────────────────────────────────────────
  ownerCard: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: PALETTE.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  ownerStripe: {
    width: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderBottomLeftRadius: RADIUS.xl,
  },
  ownerBody: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  ownerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  ownerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  ownerPriorityHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.emerald,
  },
  ownerMetaRow: {
    gap: 6,
  },
  ownerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerMetaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  ownerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 2,
  },
  ownerViewMore: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.blue,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: PALETTE.blueSoft,
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
});