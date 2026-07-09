import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  EmptyState,
} from '../components/DesignSystem';

/** Tenant Card Component */
const TenantCard = React.memo(({ item, isPriority, ownerScoped, onPress }) => {
  const { colors } = useAppTheme();

  return (
    <Surface
      level={isPriority ? 2 : 1}
      style={[
        styles.card,
        isPriority && { borderColor: colors.primary, borderWidth: 1 }
      ]}
    >
      <Pressable onPress={onPress} style={styles.cardPressable}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.secondaryContainer }]}>
            <MaterialCommunityIcons name="home-account" size={24} color={colors.onSecondaryContainer} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={1}>
              {item.tenant_name || 'Anonymous Resident'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
              {item.block} · {item.flat}
            </Text>
          </View>
          {ownerScoped ? (
            <Badge label={item.status_label} tone={item.is_active ? 'success' : 'neutral'} />
          ) : (
            <Badge label="Resident" tone="info" />
          )}
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>{item.tenant_contact || 'No contact'}</Text>
          </View>
          {item.tenant_living_from ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.onSurfaceVariant} />
              <Text style={[styles.metaText, { color: colors.onSurfaceVariant }]}>Since {item.tenant_living_from}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.cardAction, { borderTopColor: colors.outlineVariant }]}>
          <Text style={[styles.actionText, { color: colors.primary }]}>View Resident Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
        </View>
      </Pressable>
    </Surface>
  );
});

export default function TenantsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const role = String(user?.role || '').toUpperCase();
  const canManage = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const ownerScoped = isOwner || !!route.params?.ownerScoped;
  const priorityPropertyId = route.params?.priorityPropertyId;

  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const sortRows = useCallback((data) => {
    if (!priorityPropertyId) return data;
    const targetId = String(priorityPropertyId);
    return [
      ...data.filter((item) => String(item.property_id) === targetId),
      ...data.filter((item) => String(item.property_id) !== targetId),
    ];
  }, [priorityPropertyId]);

  const loadOwnerScoped = useCallback(async () => {
    if (!user?.mobile) return setRows([]);
    setLoading(true);
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
      const ownerFlats = res.data || [];
      const expanded = ownerFlats.flatMap((flat) => {
        const active = flat.tenant_name ? [{
          key: `active-${flat.property_id}`,
          property_id: flat.property_id,
          block: flat.block,
          flat: flat.flat,
          tenant_name: flat.tenant_name,
          tenant_contact: flat.tenant_contact,
          tenant_living_from: flat.tenant_living_from,
          status_label: 'Active',
          is_active: true,
        }] : [];
        const history = (flat.past_tenants || []).map((tenant, idx) => ({
          key: `history-${flat.property_id}-${idx}`,
          property_id: flat.property_id,
          block: flat.block,
          flat: flat.flat,
          tenant_name: tenant.tenant_name,
          tenant_contact: tenant.tenant_contact,
          tenant_living_from: tenant.tenant_living_from,
          status_label: 'Inactive',
          is_active: false,
        }));
        return [...active, ...history];
      });

      const filtered = expanded.filter(item =>
        !search || (item.tenant_name || '').toLowerCase().includes(search.toLowerCase())
      );
      setRows(sortRows(filtered));
    } finally {
      setLoading(false);
    }
  }, [search, sortRows, user?.mobile]);

  const loadAdminScoped = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.append('tenant', search);
      const res = await apiRequest(`/api/tenants?${p.toString()}`);
      setRows(sortRows(res.data || []));
    } finally {
      setLoading(false);
    }
  }, [search, sortRows]);

  const load = useCallback(async () => {
    if (ownerScoped) return loadOwnerScoped();
    return loadAdminScoped();
  }, [loadAdminScoped, loadOwnerScoped, ownerScoped]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }) => (
    <TenantCard
      item={item}
      ownerScoped={ownerScoped}
      isPriority={String(item.property_id) === String(priorityPropertyId || '')}
      onPress={() => {
        if (ownerScoped) {
          navigation.navigate('TenantDetails', {
            propertyId: item.property_id,
            readOnly: true,
            snapshot: item,
          });
        } else {
          navigation.navigate('TenantDetails', { propertyId: item.property_id, readOnly: false });
        }
      }}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader
          title={ownerScoped ? 'My Residents' : 'Resident Directory'}
          actionLabel={canManage ? "Add New" : undefined}
          onAction={() => navigation.navigate('AddTenant')}
        />
        <Surface level={1} style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search residents..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
          />
        </Surface>
      </View>

      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item) => item.key || String(item.property_id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="account-search"
              title="No residents found"
              subtitle="We couldn't find any residents matching your search."
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
  card: {
    padding: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardPressable: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    ...typography.titleMedium,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  cardMeta: {
    gap: 8,
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
