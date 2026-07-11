import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];

export default function AdminRegistrationRequestsScreen() {
  const { getRegistrationRequests } = useAuth();
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getRegistrationRequests();
      setRequests(rows || []);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => requests.filter((r) => String(r.status || '').toUpperCase() === filter), [requests, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <SectionHeader title="Registration Requests" subtitle="Manage community access requests." />

        <View style={styles.tabRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.tab,
                { backgroundColor: colors.surfaceContainerHighest },
                filter === f && { backgroundColor: colors.primary }
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.tabTxt,
                { color: colors.onSurfaceVariant },
                filter === f && { color: colors.onPrimary }
              ]}>
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item, index }) => (
          <Surface level={1} style={index === 0 ? styles.firstItem : (index === (filtered.length - 1) ? styles.lastItem : styles.midItem)}>
            <ActivityRow
              title={item.name}
              subtitle={`${item.block} · ${item.flat} (${item.mobile})`}
              time={item.created_at}
              icon="account-clock"
              tone={filter === 'PENDING' ? 'warning' : (filter === 'APPROVED' ? 'success' : 'danger')}
              isLast={index === filtered.length - 1}
              onPress={() => filter === 'PENDING' ? navigation.navigate('PendingRequestEdit', { request: item }) : null}
            />
          </Surface>
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="account-clock"
              title="No requests found"
              subtitle={`There are no ${filter.toLowerCase()} registration requests at this time.`}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tab: { flex: 1, borderRadius: 100, paddingVertical: 10, alignItems: 'center' },
  tabTxt: { ...typography.labelMedium, fontWeight: '700' },
  listContent: { padding: 16 },
  firstItem: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
  midItem: { borderRadius: 0, paddingHorizontal: 16 },
  lastItem: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 16 },
});
