import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  SettingsRow,
  EmptyState,
  FormButton,
} from '../components/DesignSystem';

export default function OwnerDetailsScreen() {
  const { user } = useAuth();
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <Surface level={2} style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            {data?.owner_photo_url ? (
              <Image source={{ uri: data.owner_photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>{initial}</Text>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: colors.onSurface }]} numberOfLines={1}>{data?.owner_name || 'Pending Name'}</Text>
            <View style={styles.heroBadgeRow}>
              <Badge label={`${data?.block} · ${data?.flat}`} tone="info" />
              <Badge label={data?.is_occupied ? 'Occupied' : 'Vacant'} tone={data?.is_occupied ? 'success' : 'warning'} />
            </View>
          </View>
        </View>

        <View style={styles.heroActions}>
          <FormButton
            title="Call"
            icon="phone"
            tone="secondary"
            onPress={() => Alert.alert('Call', `Dialing ${data.owner_contact}...`)}
            style={{ flex: 1 }}
          />
          {isAdmin && !readOnly && (
            <FormButton
              title="Edit"
              icon="pencil"
              tone="primary"
              onPress={() => navigation.navigate('AddOwner', { propertyId: data.property_id, existing: data })}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Owner Profile" />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          <SettingsRow icon="account" label="Full Name" value={data?.owner_name} />
          <SettingsRow icon="phone" label="Contact" value={data?.owner_contact} tone="primary" />
          <SettingsRow icon="email" label="Email Address" value={data?.owner_email || 'Not available'} isLast />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Occupancy Details" />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          <SettingsRow icon="home" label="Current Status" value={data?.is_occupied ? 'Occupied' : 'Vacant'} tone={data?.is_occupied ? 'primary' : 'amber'} />
          <SettingsRow
            icon="account-group"
            label="Occupied By"
            value={data?.occupied_by === 'OWNER' ? 'Self (Owner)' : 'Tenant Resident'}
            isLast={data?.occupied_by !== 'TENANT'}
          />
          {data?.occupied_by === 'TENANT' && (
            <SettingsRow
              icon="home-account"
              label="Resident Name"
              value={data.tenant_name || 'Details Pending'}
              tone="primary"
              isLast
              onPress={() => navigation.navigate('TenantDetails', { propertyId: data.property_id, readOnly: true })}
            />
          )}
        </Surface>
      </View>

      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 0, overflow: 'hidden', borderRadius: radius.xxl },
  heroMain: { flexDirection: 'row', alignItems: 'center', padding: 24, gap: 20 },
  avatar: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 72, height: 72 },
  avatarText: { ...typography.headlineSmall, fontWeight: '700' },
  heroInfo: { flex: 1 },
  heroName: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  heroBadgeRow: { flexDirection: 'row', gap: 8 },
  heroActions: { flexDirection: 'row', padding: 16, gap: 12 },
  section: { marginTop: 32 },
});
