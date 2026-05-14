import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function OwnerFlatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!user?.mobile) return setRows([]);
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
      setRows(res.data || []);
    } catch {
      setRows([]);
    }
  }, [user?.mobile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TenantDetails', {
        propertyId: item.property_id,
        readOnly: true,
        snapshot: item,
      })}
    >
      <Text style={styles.title}>{item.block} | {item.flat}</Text>
      <Text style={styles.meta}>Tenant: {item.tenant_name || 'Not Available'}</Text>
      <Text style={styles.meta}>Occupied by: {String(item.occupied_by || 'OWNER').toUpperCase() === 'TENANT' ? 'Tenant' : item.is_occupied ? 'Owner' : 'Unoccupied'}</Text>
      {(item.past_tenants || []).length > 0 ? (
        <View style={styles.pastWrap}>
          <Text style={styles.pastTitle}>Past tenants</Text>
          {(item.past_tenants || []).map((t, idx) => (
            <Text key={`${t.tenant_name || 'tenant'}-${idx}`} style={styles.pastItem}>{t.tenant_name || 'NA'} | {t.tenant_contact || ''} ({t.recorded_at || ''})</Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Page>
      <Text style={styles.heading}>My Flats</Text>
      <View>
        {rows.map((item) => (
          <View key={String(item.property_id)}>
            {renderItem({ item })}
          </View>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  title: { color: '#153d63', fontWeight: '800' },
  meta: { color: '#647d93', marginTop: 4 },
  pastWrap: { marginTop: 8, backgroundColor: '#f4f8ff', padding: 8, borderRadius: 8 },
  pastTitle: { fontWeight: '800', color: '#153d63', marginBottom: 6 },
  pastItem: { color: '#394b62', marginTop: 4 },
});
