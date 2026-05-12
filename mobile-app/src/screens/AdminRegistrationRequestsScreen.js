import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';

const FILTERS = ['PENDING', 'APPROVED', 'REJECTED'];

export default function AdminRegistrationRequestsScreen() {
  const { getRegistrationRequests } = useAuth();
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
      <Text style={styles.title}>Requests</Text>
      <View style={styles.tabRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.tabTxt, filter === f && styles.tabTxtActive]}>{f === 'PENDING' ? 'Pending Requests' : f === 'APPROVED' ? 'Recent Approvals' : 'Rejected List'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? <Text style={styles.empty}>No records.</Text> : null}
      {filtered.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={styles.card}
          onPress={() => filter === 'PENDING' ? navigation.navigate('PendingRequestEdit', { request: r }) : null}
          disabled={filter !== 'PENDING'}
        >
          <Text style={styles.cardTitle}>{r.name}</Text>
          <Text style={styles.meta}>{r.email} | {r.mobile}</Text>
          <Text style={styles.meta}>{r.block} | {r.flat}</Text>
          {filter === 'PENDING' ? <Text style={styles.openText}>Open</Text> : <Text style={styles.statusTxt}>{filter}</Text>}
        </TouchableOpacity>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 10 },
  tabRow: { gap: 8, marginBottom: 10 },
  tab: { backgroundColor: '#eef4fb', borderRadius: 10, borderWidth: 1, borderColor: '#d2dfeb', padding: 10 },
  tabActive: { backgroundColor: '#1f6fb2', borderColor: '#1f6fb2' },
  tabTxt: { color: '#23517a', fontWeight: '700' },
  tabTxtActive: { color: '#fff' },
  empty: { color: '#60788f', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#d8e3f0', padding: 12, marginBottom: 10 },
  cardTitle: { fontWeight: '800', color: '#153d63', fontSize: 17 },
  meta: { color: '#60788f', marginTop: 2 },
  openText: { color: '#1f6fb2', fontWeight: '700', marginTop: 8 },
  statusTxt: { color: '#60788f', fontWeight: '700', marginTop: 8 },
});
