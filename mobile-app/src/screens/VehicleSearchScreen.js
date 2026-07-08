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

export default function VehicleSearchScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, radius } = useAppTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q) => {
    const term = (q || '').trim();
    setQuery(term);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiRequest(`/api/vehicles/search?q=${encodeURIComponent(term)}`, {}, token);
      setResults(res.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.appBg }]}>
      {/* ── Header Search Bar ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.borderStrong }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Vehicle number..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={search}
            autoFocus
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
          {searching ? (
            <View style={styles.loader} />
          ) : (
            <MaterialCommunityIcons name="car-search" size={20} color={colors.muted} style={{ marginRight: 12 }} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {query.length > 0 && query.length < 2 && (
          <Text style={[styles.hint, { color: colors.muted }]}>Type at least 2 characters to search.</Text>
        )}

        {results.length > 0 ? (
          <Surface style={{ padding: 0 }}>
            {results.map((item, idx) => (
              <ActivityRow
                key={`${item.vehicle_number}-${item.block}-${item.flat}-${idx}`}
                title={item.vehicle_number}
                subtitle={`${item.block} · ${item.flat} (${item.resident_name || item.resident_type})`}
                icon={item.vehicle_number.length > 8 ? 'car-outline' : 'motorbike'}
                tone="default"
                isLast={idx === results.length - 1}
                onPress={() => navigation.navigate('TenantOwnerRedirect', { block: item.block, flat: item.flat })}
              />
            ))}
          </Surface>
        ) : query.length >= 2 && !searching ? (
          <EmptyState
            icon="car-off"
            title="No matches"
            subtitle={`We couldn't find any vehicles matching "${query}".`}
          />
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
  hint: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '500' },
});
