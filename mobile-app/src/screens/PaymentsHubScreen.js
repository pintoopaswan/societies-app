import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

function ActionTile({ title, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress}>
      <View style={styles.actionIconWrap}>
        <MaterialCommunityIcons name={icon} size={28} color="#163b62" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function CollectionCard({ title, value, subtitle, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.collectionCard, { borderColor: color }]} onPress={onPress}>
      <Text style={styles.collectionTitle}>{title}</Text>
      <Text style={[styles.collectionValue, { color }]}>{value}</Text>
      <Text style={styles.collectionSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function PaymentsHubScreen() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
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

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const openPayments = (preset) => navigation.navigate('Payments', { preset, ts: Date.now() });

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>Payments</Text>
      <View style={styles.actionRow}>
        <ActionTile title="Payments" icon="currency-inr" onPress={() => navigation.navigate('PaymentsList')} />
        <ActionTile title="Expense" icon="cash-minus" onPress={() => navigation.navigate('ExpensesList')} />
        {canManage ? <ActionTile title="Add Payment" icon="cash-plus" onPress={() => navigation.navigate('NewPayment')} /> : null}
        {canManage ? <ActionTile title="Add Expense" icon="cash-minus" onPress={() => navigation.navigate('NewExpense')} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Collection Dashboard</Text>
      {!data ? (
        <Text>Loading...</Text>
      ) : (
        <View style={styles.collectionGrid}>
          <CollectionCard
            title="Today's Collection"
            value={`Rs ${Math.round(data.today_amount || 0)}`}
            subtitle={`${data.today_count || 0} payments`}
            color="#2d73b9"
            onPress={() => openPayments({ scope: 'today' })}
          />
          <CollectionCard
            title="Current Month"
            value={`Rs ${Math.round(data.month_amount || 0)}`}
            subtitle={`${data.month_name} ${data.year}`}
            color="#32905f"
            onPress={() => openPayments({ scope: 'month', year: data.year, month: new Date().getMonth() + 1 })}
          />
          <CollectionCard
            title="Current Year"
            value={`Rs ${Math.round(data.year_amount || 0)}`}
            subtitle={`${data.year}`}
            color="#bc6a2a"
            onPress={() => openPayments({ scope: 'year', year: data.year })}
          />
          <CollectionCard
            title="Till Date"
            value={`Rs ${Math.round(data.total_collection || 0)}`}
            subtitle="All collections"
            color="#b94d58"
            onPress={() => openPayments({ scope: 'all' })}
          />
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe5ee',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  actionIconWrap: { backgroundColor: '#ecf3fb', width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { marginTop: 8, fontWeight: '700', color: '#173a5d', textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e3e5d', marginBottom: 10 },
  collectionGrid: { gap: 10 },
  collectionCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, padding: 14 },
  collectionTitle: { color: '#4f6880', fontWeight: '600' },
  collectionValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  collectionSub: { color: '#607b95', marginTop: 2 },
});
