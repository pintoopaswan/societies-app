import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  ActivityRow,
  Surface,
  EmptyState,
} from '../components/DesignSystem';

export default function DashboardSearchScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ owners: [], tenants: [], vehicles: [] });
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);

  const performSearch = async (term) => {
    if (term.length < 2) {
      setResults({ owners: [], tenants: [], vehicles: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const [ownersRes, tenantsRes, vehiclesRes] = await Promise.all([
        apiRequest(`/api/owners?owner=${encodeURIComponent(term)}`, {}, token),
        apiRequest(`/api/tenants?tenant=${encodeURIComponent(term)}`, {}, token),
        apiRequest(`/api/vehicles/search?q=${encodeURIComponent(term)}`, {}, token),
      ]);
      setResults({
        owners: (ownersRes.data || []).slice(0, 5),
        tenants: (tenantsRes.data || []).slice(0, 5),
        vehicles: (vehiclesRes.data || []).slice(0, 5),
      });
    } catch {
      setResults({ owners: [], tenants: [], vehicles: [] });
    } finally {
      setSearching(false);
    }
  };

  const onSearchChange = (text) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const term = text.trim();
    if (!term) {
      setResults({ owners: [], tenants: [], vehicles: [] });
      setSearching(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(term);
    }, 400);
  };

  const totalCount = results.owners.length + results.tenants.length + results.vehicles.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Surface level={2} style={styles.searchBox}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.onSurface }]}
            placeholder="Search residents, vehicles..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={onSearchChange}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 16 }} />}
        </Surface>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {totalCount > 0 ? (
          <>
            {results.owners.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>OWNERS</Text>
                <Surface level={1} style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
                  {results.owners.map((item, idx) => (
                    <ActivityRow
                      key={`owner-${item.property_id}`}
                      title={item.owner_name}
                      subtitle={`${item.block} · ${item.flat}`}
                      icon="account-tie"
                      isLast={idx === results.owners.length - 1}
                      onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id })}
                    />
                  ))}
                </Surface>
              </View>
            )}

            {results.tenants.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>TENANTS</Text>
                <Surface level={1} style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
                  {results.tenants.map((item, idx) => (
                    <ActivityRow
                      key={`tenant-${item.property_id}`}
                      title={item.tenant_name}
                      subtitle={`${item.block} · ${item.flat}`}
                      icon="home-account"
                      isLast={idx === results.tenants.length - 1}
                      onPress={() => navigation.navigate('TenantDetails', { propertyId: item.property_id })}
                    />
                  ))}
                </Surface>
              </View>
            )}

            {results.vehicles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>VEHICLES</Text>
                <Surface level={1} style={{ padding: 0, borderRadius: 16, overflow: 'hidden' }}>
                  {results.vehicles.map((item, idx) => (
                    <ActivityRow
                      key={`vehicle-${idx}`}
                      title={item.vehicle_number}
                      subtitle={`${item.block} · ${item.flat} (${item.resident_name || 'Resident'})`}
                      icon="car"
                      isLast={idx === results.vehicles.length - 1}
                      onPress={() => navigation.navigate('TenantOwnerRedirect', { block: item.block, flat: item.flat })}
                    />
                  ))}
                </Surface>
              </View>
            )}
          </>
        ) : query.length >= 2 && !searching ? (
          <EmptyState
            icon="magnify-close"
            title="No matches found"
            subtitle={`Nothing matched "${query}" across residents or vehicles.`}
          />
        ) : (
          <EmptyState
            icon="magnify"
            title="Smart Search"
            subtitle="Search across owners, tenants, and vehicles from one place."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 56, padding: 0, borderRadius: 28 },
  backBtn: { width: 56, height: '100%', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, ...typography.bodyLarge, paddingRight: 8 },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.labelSmall, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, marginLeft: 8 },
});
