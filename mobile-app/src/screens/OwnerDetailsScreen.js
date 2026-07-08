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
  EmptyState,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function OwnerDetailsScreen() {
  const { user, token } = useAuth();
  const { colors, radius } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const propertyId = route.params?.propertyId;
  const readOnly = !!route.params?.readOnly;

  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setRefreshing(true);
    try {
      const res = await apiRequest(`/api/owners/${propertyId}`);
      setData(res.data || null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to load owner details.');
    } finally {
      setRefreshing(false);
    }
  }, [propertyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data && !refreshing) return <Page><EmptyState title="Not Found" subtitle="Owner record not available." /></Page>;

  const initial = String(data?.owner_name || 'O').charAt(0).toUpperCase();

  return (
    <Page
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <Surface style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceSoft }]}>
            {data?.owner_photo_url ? (
              <Image source={{ uri: data.owner_photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: colors.text }]} numberOfLines={1}>{data?.owner_name || 'Pending Name'}</Text>
            <View style={styles.heroBadgeRow}>
              <Badge label={`${data?.block} · ${data?.flat}`} tone="info" />
              <Badge label={data?.is_occupied ? 'Occupied' : 'Vacant'} tone={data?.is_occupied ? 'success' : 'warning'} />
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Call', `Dialing ${data.owner_contact}...`)}>
            <MaterialCommunityIcons name="phone" size={18} color={colors.primaryBlue} />
            <Text style={[styles.actionBtnText, { color: colors.primaryBlue }]}>Call Owner</Text>
          </TouchableOpacity>
          {isAdmin && !readOnly && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddOwner', { propertyId: data.property_id, existing: data })}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primaryBlue} />
              <Text style={[styles.actionBtnText, { color: colors.primaryBlue }]}>Edit Record</Text>
            </TouchableOpacity>
          )}
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Contact Information" />
        <Surface style={{ padding: 0 }}>
          <SettingsRow icon="account-outline" label="Owner Name" value={data?.owner_name} tone="default" />
          <SettingsRow icon="phone-outline" label="Contact" value={data?.owner_contact} tone="blue" />
          <SettingsRow icon="email-outline" label="Email Address" value="—" tone="default" isLast />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Occupancy Details" />
        <Surface style={{ padding: 0 }}>
          <SettingsRow icon="home-outline" label="Current Status" value={data?.is_occupied ? 'Occupied' : 'Vacant'} tone={data?.is_occupied ? 'green' : 'amber'} />
          <SettingsRow icon="account-group-outline" label="Occupied By" value={data?.occupied_by} tone="default" />
          {data?.occupied_by === 'TENANT' && (
            <SettingsRow
              icon="account-tie-outline"
              label="Tenant"
              value={data.tenant_name || 'Not Available'}
              tone="blue"
              isLast
              onPress={() => navigation.navigate('TenantDetails', { propertyId: data.property_id, readOnly: true })}
            />
          )}
        </Surface>
      </View>
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
