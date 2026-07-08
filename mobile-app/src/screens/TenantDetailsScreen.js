import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  SettingsRow,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function TenantDetailsScreen() {
  const { user, token } = useAuth();
  const { colors, radius } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const propertyId = route.params?.propertyId;
  const readOnly = !!route.params?.readOnly;
  const snapshot = route.params?.snapshot;

  const [data, setData] = useState(snapshot || null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setRefreshing(true);
    try {
      const res = await apiRequest(`/api/tenants/${propertyId}`);
      setData(res.data || null);
    } catch (e) {
      if (!snapshot) Alert.alert('Error', e.message || 'Unable to load tenant details.');
    } finally {
      setRefreshing(false);
    }
  }, [propertyId, snapshot]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data && !refreshing) return <Page><EmptyState title="Not Found" subtitle="Tenant record not available." /></Page>;

  const initial = String(data?.tenant_name || 'T').charAt(0).toUpperCase();

  return (
    <Page
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <Surface style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSoft }]}>
            {data?.tenant_photo_url ? (
              <Image source={{ uri: data.tenant_photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{data?.tenant_name || 'Name Pending'}</Text>
            <View style={styles.heroBadgeRow}>
              <Badge label={`${data?.block} · ${data?.flat}`} tone="info" />
              <Badge label="Tenant" tone="neutral" />
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Call', `Dialing ${data.tenant_contact}...`)}>
            <MaterialCommunityIcons name="phone" size={18} color={colors.primaryBlue} />
            <Text style={[styles.actionBtnText, { color: colors.primaryBlue }]}>Call Tenant</Text>
          </TouchableOpacity>
          {isAdmin && !readOnly && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddTenant', { block: data.block, flat: data.flat, owner_name: data.owner_name })}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryBlue} />
              <Text style={[styles.actionBtnText, { color: colors.primaryBlue }]}>Edit Tenant</Text>
            </TouchableOpacity>
          )}
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Resident Information" />
        <Surface style={{ padding: 0 }}>
          <SettingsRow icon="account-outline" label="Full Name" value={data?.tenant_name} tone="default" />
          <SettingsRow icon="phone-outline" label="Contact" value={data?.tenant_contact} tone="blue" />
          <SettingsRow icon="calendar-outline" label="Living From" value={data?.tenant_living_from || '—'} tone="default" />
          <SettingsRow icon="car-outline" label="Vehicles" value={data?.tenant_vehicle_list || 'None'} tone="amber" isLast />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Owner Reference" />
        <Surface style={{ padding: 0 }}>
          <ActivityRow
            title={data?.owner_name || 'No Owner'}
            subtitle={data?.owner_contact || 'Contact info pending'}
            icon="account-tie-outline"
            tone="indigo"
            isLast
            onPress={() => navigation.navigate('OwnerDetails', { propertyId: data.property_id, readOnly: true })}
          />
        </Surface>
      </View>

      {data?.payment_history?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recent Payments" />
          <Surface style={{ padding: 0 }}>
            {data.payment_history.slice(0, 5).map((p, idx) => (
              <ActivityRow
                key={`${p.year}-${p.month}`}
                title={`${p.month}/${p.year}`}
                subtitle={`${p.mode_of_payment} · ${fmtAmount(p.amount)}`}
                time={p.payment_date}
                icon="cash-check"
                tone="payment"
                isLast={idx === 4 || idx === data.payment_history.length - 1}
              />
            ))}
          </Surface>
        </View>
      )}

      <View style={{ height: 24 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 0, overflow: 'hidden' },
  heroMain: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 64, height: 64 },
  avatarText: { fontSize: 24, fontWeight: '900' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  heroBadgeRow: { flexDirection: 'row', gap: 6 },
  divider: { height: 1 },
  heroActions: { flexDirection: 'row', padding: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  section: { marginTop: 24 },
});
