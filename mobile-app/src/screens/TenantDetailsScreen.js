import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
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
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  SettingsRow,
  ActivityRow,
  EmptyState,
  FormButton,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function TenantDetailsScreen() {
  const { user } = useAuth();
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
      if (!snapshot) Alert.alert('Error', e.message || 'Unable to load resident details.');
    } finally {
      setRefreshing(false);
    }
  }, [propertyId, snapshot]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data && !refreshing) return <Page><EmptyState title="Not Found" subtitle="Resident record not available." /></Page>;

  const initial = String(data?.tenant_name || 'R').charAt(0).toUpperCase();

  return (
    <Page
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <Surface level={2} style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            {data?.tenant_photo_url ? (
              <Image source={{ uri: data.tenant_photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>{initial}</Text>
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: colors.onSurface }]} numberOfLines={1}>{data?.tenant_name || 'Name Pending'}</Text>
            <View style={styles.heroBadgeRow}>
              <Badge label={`${data?.block} · ${data?.flat}`} tone="info" />
              <Badge label="Resident" tone="success" />
            </View>
          </View>
        </View>

        <View style={styles.heroActions}>
          <FormButton
            title="Call"
            icon="phone"
            tone="secondary"
            onPress={() => Alert.alert('Call', `Dialing ${data.tenant_contact}...`)}
            style={{ flex: 1 }}
          />
          {isAdmin && !readOnly && (
            <FormButton
              title="Edit"
              icon="pencil"
              tone="primary"
              onPress={() => navigation.navigate('AddTenant', { block: data.block, flat: data.flat, owner_name: data.owner_name })}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Resident Profile" />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          <SettingsRow icon="account" label="Full Name" value={data?.tenant_name} />
          <SettingsRow icon="phone" label="Contact" value={data?.tenant_contact} tone="primary" />
          <SettingsRow icon="calendar" label="Living From" value={data?.tenant_living_from || 'Not recorded'} />
          <SettingsRow icon="car" label="Vehicles" value={data?.tenant_vehicle_list || 'None registered'} isLast />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Property Owner" />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          <ActivityRow
            title={data?.owner_name || 'Owner Not Linked'}
            subtitle={data?.owner_contact || 'Contact info pending'}
            icon="account-tie"
            tone="primary"
            isLast
            onPress={() => navigation.navigate('OwnerDetails', { propertyId: data.property_id, readOnly: true })}
          />
        </Surface>
      </View>

      {data?.payment_history?.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Payment History" />
          <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
            {data.payment_history.slice(0, 5).map((p, idx) => (
              <ActivityRow
                key={`${p.year}-${p.month}`}
                title={`${p.month}/${p.year}`}
                subtitle={`${p.mode_of_payment} · ${fmtAmount(p.amount)}`}
                time={p.payment_date}
                icon="cash-check"
                tone="success"
                isLast={idx === 4 || idx === data.payment_history.length - 1}
              />
            ))}
          </Surface>
        </View>
      )}

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
