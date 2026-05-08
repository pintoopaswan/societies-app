import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';

const TILE_COLORS = [
  { bg: '#e8f1ff', border: '#4f81c8', title: '#2f5f99' },
  { bg: '#eaf8ef', border: '#58ad77', title: '#357a51' },
  { bg: '#fff4e8', border: '#f09a45', title: '#a5652a' },
  { bg: '#ffeef0', border: '#e87078', title: '#a24048' },
];

export default function DashboardScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/dashboard');
      setData(res.data);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const goPayments = (preset) => navigation.navigate('Payments', { preset, ts: Date.now() });

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>Collection Dashboard</Text>
      {!data ? <Text>Loading...</Text> : (
        <View style={styles.grid}>
          <Tile color={TILE_COLORS[0]} title="Today" value={`Rs ${Math.round(data.today_amount)}`} subtitle={`${data.today_count} payments`} onPress={() => goPayments({ scope: 'today' })} />
          <Tile color={TILE_COLORS[1]} title="Current Month" value={`Rs ${Math.round(data.month_amount)}`} subtitle={`${data.month_name} ${data.year}`} onPress={() => goPayments({ scope: 'month', year: data.year, month: new Date().getMonth() + 1 })} />
          <Tile color={TILE_COLORS[2]} title="Current Year" value={`Rs ${Math.round(data.year_amount)}`} subtitle={`${data.year}`} onPress={() => goPayments({ scope: 'year', year: data.year })} />
          <Tile color={TILE_COLORS[3]} title="Till Date" value={`Rs ${Math.round(data.total_collection || 0)}`} subtitle="All collections" onPress={() => goPayments({ scope: 'all' })} />
        </View>
      )}
    </Page>
  );
}

function Tile({ title, value, subtitle, onPress, color }) {
  return (
    <TouchableOpacity style={[styles.tile, { backgroundColor: color.bg, borderColor: color.border }]} onPress={onPress}>
      <Text style={[styles.tileTitle, { color: color.title }]}>{title}</Text>
      <Text style={[styles.tileValue, { color: color.title }]}>{value}</Text>
      <Text style={styles.tileSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  grid: { gap: 10 },
  tile: { borderRadius: 16, borderWidth: 2, padding: 16, shadowColor: '#21466b', shadowOpacity: 0.09, shadowRadius: 10, elevation: 3 },
  tileTitle: { fontWeight: '700' },
  tileValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  tileSub: { color: '#5e7489', marginTop: 2 },
});
