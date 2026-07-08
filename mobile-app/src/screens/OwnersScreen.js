import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
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
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

const BLOCKS = ['ALL', ...Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`)];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single filter input field with label */
function FilterField({ label, children }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.filterLabel, { color: colors.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

/** Owner row card — timeline-inspired with left accent stripe */
function OwnerCard({ item, isPriority, onPress }) {
  const { colors } = useAppTheme();
  const stripeColor = isPriority ? colors.success : colors.primaryBlue;
  const occupied = item.is_occupied;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ownerCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      {/* left accent stripe */}
      <View style={[styles.ownerStripe, { backgroundColor: stripeColor }]} />

      <View style={styles.ownerBody}>
        {/* top row: flat + occupancy badge */}
        <View style={styles.ownerTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.ownerTitle, { color: colors.text }]} numberOfLines={1}>
              {item.block}  ·  {item.flat}
            </Text>
            {isPriority && (
              <Text style={[styles.ownerPriorityHint, { color: colors.success }]}>Highlighted result</Text>
            )}
          </View>
          <Badge
            label={occupied ? 'Occupied' : 'Vacant'}
            tone={occupied ? 'success' : 'warning'}
          />
        </View>

        {/* meta row */}
        <View style={styles.ownerMetaRow}>
          <View style={styles.ownerMetaItem}>
            <MaterialCommunityIcons name="account-tie-outline" size={14} color={colors.muted} />
            <Text style={[styles.ownerMetaText, { color: colors.muted }]} numberOfLines={1}>
              {item.owner_name || 'Name not set'}
            </Text>
          </View>
          <View style={styles.ownerMetaItem}>
            <MaterialCommunityIcons name="phone-outline" size={14} color={colors.muted} />
            <Text style={[styles.ownerMetaText, { color: colors.muted }]} numberOfLines={1}>
              {item.owner_contact || 'Contact not set'}
            </Text>
          </View>
        </View>

        {/* footer */}
        <View style={styles.ownerFooter}>
          <Text style={[styles.ownerViewMore, { color: colors.primaryBlue }]}>View details</Text>
          <MaterialCommunityIcons name="arrow-right" size={13} color={colors.primaryBlue} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OwnersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, radius, shadow } = useAppTheme();
  const priorityPropertyId = route.params?.priorityPropertyId;

  const [filters, setFilters] = useState({ block: 'ALL', flat: '', owner: '', contact: '' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if ((v || '').trim()) p.append(k, v);
    });
    return `/api/owners?${p.toString()}`;
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [priorityPropertyId, query]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resultCount = rows.length;

  return (
    <Page
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primaryBlue} />}
    >

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Surface style={styles.heroCard}>
        <View style={[styles.blobA, { backgroundColor: colors.accentSoft }]} />
        <View style={[styles.blobB, { backgroundColor: colors.primaryBlue + '08' }]} />

        <View style={styles.heroPillsRow}>
          <Badge label="DIRECTORY" tone="info" />
          <Badge label="Owners" tone="neutral" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Owner Details</Text>
        <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
          Search and filter registered flat owners by block, flat number, name, or contact.
        </Text>
      </Surface>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader title="Search filters" subtitle="Narrow results by any combination of fields." />

        <Surface style={styles.filterCard}>
          <FilterField label="Block">
            <View style={[styles.pickerBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
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
                  style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 101"
                  placeholderTextColor={colors.muted}
                  value={filters.flat}
                  onChangeText={(v) => setFilters((p) => ({ ...p, flat: v }))}
                />
              </FilterField>
            </View>
            <View style={{ flex: 1 }}>
              <FilterField label="Owner name">
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Sharma"
                  placeholderTextColor={colors.muted}
                  value={filters.owner}
                  onChangeText={(v) => setFilters((p) => ({ ...p, owner: v }))}
                />
              </FilterField>
            </View>
          </View>

          <FilterField label="Contact number">
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 98765…"
              placeholderTextColor={colors.muted}
              value={filters.contact}
              onChangeText={(v) => setFilters((p) => ({ ...p, contact: v }))}
              keyboardType="phone-pad"
            />
          </FilterField>

          <Pressable
            onPress={load}
            style={({ pressed }) => [
              styles.searchBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.searchBtnText}>Search owners</Text>
          </Pressable>
        </Surface>
      </View>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Results"
          subtitle={resultCount > 0 ? `${resultCount} owner${resultCount === 1 ? '' : 's'} found` : 'No results yet'}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="account-search-outline"
            title="No owners found"
            subtitle="Adjust your filters and tap Search to find matching owners."
          />
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
    padding: 20,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    top: -50, right: -40,
    width: 180, height: 180,
    borderRadius: 90,
  },
  blobB: {
    position: 'absolute',
    bottom: -60, left: -50,
    width: 200, height: 200,
    borderRadius: 100,
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
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },

  // ── Filter card ───────────────────────────────────────────────────────────
  filterCard: {
    padding: 18,
    gap: 12,
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
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pickerBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
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
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ownerStripe: {
    width: 4,
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
    letterSpacing: -0.3,
  },
  ownerPriorityHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
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
  },
});
