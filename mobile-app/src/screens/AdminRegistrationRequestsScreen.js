import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];

export default function AdminRegistrationRequestsScreen() {
  const { getRegistrationRequests } = useAuth();
  const { colors, radius } = useAppTheme();
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('PENDING');

  const load = async () => {
    const rows = await getRegistrationRequests();
    setRequests(rows || []);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = useMemo(() => requests.filter((r) => String(r.status || '').toUpperCase() === filter), [requests, filter]);

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Administration</Text>
        <Text style={[styles.title, { color: colors.text }]}>Requests</Text>
      </View>

      <View style={styles.tabRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.tab,
              { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
              filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabTxt, { color: colors.muted }, filter === f && { color: '#fff' }]}>
              {f === 'PENDING' ? 'Pending' : f === 'APPROVED' ? 'Approved' : 'Rejected'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title={filter === 'PENDING' ? 'Awaiting Action' : 'Historical'} subtitle={`${filtered.length} requests`} />
        {filtered.length === 0 ? (
          <EmptyState
            icon="account-clock-outline"
            title="No records"
            subtitle={`There are no ${filter.toLowerCase()} registration requests.`}
          />
        ) : (
          <Surface style={{ padding: 0 }}>
            {filtered.map((r, idx) => (
              <ActivityRow
                key={r.id}
                title={r.name}
                subtitle={`${r.block} · ${r.flat} (${r.mobile})`}
                time={r.created_at}
                icon="account-outline"
                tone={filter === 'PENDING' ? 'warning' : filter === 'APPROVED' ? 'update' : 'complaint'}
                isLast={idx === filtered.length - 1}
                onPress={() => filter === 'PENDING' ? navigation.navigate('PendingRequestEdit', { request: r }) : null}
              />
            ))}
          </Surface>
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tab: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  tabTxt: { fontWeight: '700', fontSize: 13 },
  section: { marginTop: 0 },
});
