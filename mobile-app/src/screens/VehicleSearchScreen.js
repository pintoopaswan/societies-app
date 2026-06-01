import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, radius, shadow } from '../lib/theme';

function VehicleResultCard({ item }) {
  const flatLabel = [item.block, item.flat].filter(Boolean).join(' ');
  const residentType = item.resident_type || 'Resident';

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultCopy}>
        <Text style={styles.vehicleNumber}>{item.vehicle_number}</Text>
        <Text style={styles.resultMeta}>{residentType}{flatLabel ? `, ${flatLabel}` : ''}</Text>
      </View>
      <MaterialCommunityIcons name="card-account-details-outline" size={34} color="#747474" />
    </View>
  );
}

export default function VehicleSearchScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [searchedFor, setSearchedFor] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    const nextQuery = query.trim();
    if (!nextQuery) {
      setSearchedFor('');
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest(`/api/vehicles/search?q=${encodeURIComponent(nextQuery)}`, {}, token);
      setResults(res.data || []);
      setSearchedFor(nextQuery);
    } catch (e) {
      setResults([]);
      setSearchedFor(nextQuery);
      Alert.alert('Error', e.message || 'Unable to search vehicle details.');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery('');
    setSearchedFor('');
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#747474" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Enter Vehicle Number"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={search}
          />
          {query ? (
            <TouchableOpacity style={styles.clearButton} onPress={clear}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#a7a7a7" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={search} disabled={loading}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {!loading && searchedFor && results.length > 0 ? (
          <>
            <Text style={styles.resultLabel}>Search result for <Text style={styles.resultQuery}>{searchedFor}</Text></Text>
            <View style={styles.resultList}>
              {results.map((item, index) => (
                <VehicleResultCard key={`${item.vehicle_number}-${item.block}-${item.flat}-${index}`} item={item} />
              ))}
            </View>
          </>
        ) : null}

        {!loading && searchedFor && results.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-search-outline" size={92} color="#b8bbc1" />
            <Text style={styles.emptyTitle}>No Vehicle Details Found</Text>
            <Text style={styles.emptySubtitle}>We cannot find the vehicle details for the number you entered.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  searchHeader: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 10,
  },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flex: 1,
    height: 46,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#d3d5d8',
    backgroundColor: '#f7f8fa',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
  },
  searchInput: { flex: 1, color: '#25282c', fontSize: 16, paddingVertical: 0, minHeight: 20 },
  clearButton: { padding: 4 },
  searchButton: {
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    minWidth: 96,
  },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  content: { flexGrow: 1, padding: 22, paddingTop: 42 },
  resultLabel: { color: '#595d62', fontSize: 18, marginBottom: 24 },
  resultQuery: { color: '#303236', fontWeight: '800' },
  resultList: { gap: 22 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.card,
  },
  resultCopy: { flex: 1, paddingRight: 16 },
  vehicleNumber: { color: '#202327', fontSize: 22, fontWeight: '900', marginBottom: 12 },
  resultMeta: { color: '#64676c', fontSize: 19 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 64 },
  emptyTitle: { color: '#202327', fontSize: 20, fontWeight: '900', marginTop: 24, textAlign: 'center' },
  emptySubtitle: { color: '#909090', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: 18, maxWidth: 320 },
});
