import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

/** Owner card profile layout */
const OwnerCard = React.memo(({ item, isPriority, onPress }) => {
  const { colors, radius } = useAppTheme();
  const occupied = item.is_occupied;

  return (
    <Surface
      level={isPriority ? 2 : 1}
      style={[
        styles.ownerCard,
        isPriority && { borderColor: colors.primary, borderWidth: 1 }
      ]}
    >
      <Pressable onPress={onPress} style={styles.ownerPressable}>
        <View style={styles.ownerHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerHighest }]}>
            <MaterialCommunityIcons name="account-tie" size={24} color={colors.primary} />
          </View>
          <View style={styles.ownerInfo}>
            <Text style={[styles.ownerTitle, { color: colors.onSurface }]} numberOfLines={1}>
              {item.owner_name || 'Unnamed Owner'}
            </Text>
            <Text style={[styles.flatTitle, { color: colors.onSurfaceVariant }]}>
              {item.block} · {item.flat}
            </Text>
          </View>
          <Badge
            label={occupied ? 'Occupied' : 'Vacant'}
            tone={occupied ? 'success' : 'warning'}
          />
        </View>

        <View style={styles.ownerMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{item.owner_contact || 'No contact'}</Text>
          </View>
        </View>

        <View style={[styles.cardAction, { borderTopColor: colors.outlineVariant }]}>
          <Text style={[styles.actionText, { color: colors.primary }]}>View Full Profile</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
        </View>
      </Pressable>
    </Surface>
  );
});

export default function OwnersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const priorityPropertyId = route.params?.priorityPropertyId;

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef(null);

  const load = useCallback(async (searchTerm = search) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (searchTerm) p.append('owner', searchTerm);

      const res = await apiRequest(`/api/owners?${p.toString()}`);
      const data = res.data || [];

      if (priorityPropertyId) {
        const targetId = String(priorityPropertyId);
        setRows([
          ...data.filter((item) => String(item.property_id) === targetId),
          ...data.filter((item) => String(item.property_id) !== targetId),
        ]);
      } else {
        setRows(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [priorityPropertyId, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSearchChange = (text) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      load(text);
    }, 400);
  };

  const renderItem = ({ item }) => (
    <OwnerCard
      item={item}
      isPriority={String(item.property_id) === String(priorityPropertyId || '')}
      onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id })}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader title="Property Owners" />
        <Surface level={1} style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={search}
            onChangeText={onSearchChange}
          />
        </Surface>
      </View>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.property_id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="account-search"
              title="No owners found"
              subtitle="Try searching for a different name or block."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    ...typography.bodyLarge,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  ownerCard: {
    padding: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ownerPressable: {
    padding: 16,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  ownerTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  flatTitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  ownerMeta: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    ...typography.bodyMedium,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionText: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
});
