import React, { useCallback, useState } from 'react';
import {
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
import { useAppTheme } from '../lib/theme';
import {
  ActivityRow,
  Surface,
  EmptyState,
} from '../components/DesignSystem';

export default function DashboardSearchScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useAppTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ owners: [], tenants: [], vehicles: [] });
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q) => {
    const term = (q || '').trim();
    setQuery(term);
    if (term.length < 2) {
      setResults({ owners: [], tenants: [], vehicles: [] });
      return;
    }
    setSearching(true);
    try {
      // Parallel search for owners, tenants, and vehicles
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
  }, []);

  const totalCount = results.owners.length + results.tenants.length + results.vehicles.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.appBg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.borderStrong }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search name, flat, vehicle..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={search}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searching && <View style={styles.loader} />}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {totalCount > 0 ? (
          <>
            {results.owners.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>OWNERS</Text>
                <Surface style={{ padding: 0 }}>
                  {results.owners.map((item, idx) => (
                    <ActivityRow
                      key={`owner-${item.property_id}`}
                      title={item.owner_name}
                      subtitle={`${item.block} · ${item.flat}`}
                      icon="account-tie-outline"
                      isLast={idx === results.owners.length - 1}
                      onPress={() => navigation.navigate('OwnerDetails', { propertyId: item.property_id })}
                    />
                  ))}
                </Surface>
              </View>
            )}

            {results.tenants.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>TENANTS</Text>
                <Surface style={{ padding: 0 }}>
                  {results.tenants.map((item, idx) => (
                    <ActivityRow
                      key={`tenant-${item.property_id}`}
                      title={item.tenant_name}
                      subtitle={`${item.block} · ${item.flat}`}
                      icon="account-group-outline"
                      isLast={idx === results.tenants.length - 1}
                      onPress={() => navigation.navigate('TenantDetails', { propertyId: item.property_id })}
                    />
                  ))}
                </Surface>
              </View>
            )}

            {results.vehicles.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>VEHICLES</Text>
                <Surface style={{ padding: 0 }}>
                  {results.vehicles.map((item, idx) => (
                    <ActivityRow
                      key={`vehicle-${idx}`}
                      title={item.vehicle_number}
                      subtitle={`${item.block} · ${item.flat} (${item.resident_name || 'Resident'})`}
                      icon="car-outline"
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
            title="No results found"
            subtitle={`Nothing matched "${query}" across residents or vehicles.`}
          />
        ) : query.length > 0 && query.length < 2 ? (
          <Text style={[styles.hint, { color: colors.muted }]}>Type at least 2 characters to search.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, height: 50 },
  backBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 16, fontWeight: '600', paddingRight: 8 },
  loader: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#ccc', borderTopColor: '#333', marginRight: 12 },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  hint: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '500' },
});
