import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
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

export default function VehicleSearchScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);

  const performSearch = async (term) => {
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
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
  };

  const onSearchChange = (text) => {
    const term = text.trim();
    setQuery(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(term);
    }, 400);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header Search Bar ── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Surface level={2} style={styles.searchBox}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.onSurface }]}
            placeholder="Search vehicle number..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={query}
            onChangeText={onSearchChange}
            autoFocus
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />
          ) : (
            <MaterialCommunityIcons name="car-search" size={22} color={colors.onSurfaceVariant} style={{ marginRight: 12 }} />
          )}
        </Surface>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {results.length > 0 ? (
          <Surface level={1} style={{ padding: 0 }}>
            {results.map((item, idx) => (
              <ActivityRow
                key={`${item.vehicle_number}-${item.block}-${item.flat}-${idx}`}
                title={item.vehicle_number}
                subtitle={`${item.block} · ${item.flat} (${item.resident_name || item.resident_type})`}
                icon={item.vehicle_number.length > 8 ? 'car' : 'motorbike'}
                tone="primary"
                isLast={idx === results.length - 1}
                onPress={() => navigation.navigate('TenantOwnerRedirect', { block: item.block, flat: item.flat })}
              />
            ))}
          </Surface>
        ) : query.length >= 2 && !searching ? (
          <EmptyState
            icon="car-off"
            title="Vehicle not found"
            subtitle={`We couldn't find any vehicle matching "${query}".`}
          />
        ) : query.length > 0 && query.length < 2 ? (
            <EmptyState
              icon="dots-horizontal"
              title="Keep typing..."
              subtitle="Enter at least 2 characters to search the registry."
            />
        ) : (
            <EmptyState
              icon="car-info"
              title="Vehicle Registry"
              subtitle="Enter a vehicle number to find its associated flat and resident."
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
});
