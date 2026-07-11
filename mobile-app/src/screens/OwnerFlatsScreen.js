import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  ActivityRow,
  EmptyState,
} from '../components/DesignSystem';

function fmtAmount(value) {
  return `₹${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export default function OwnerFlatsScreen() {
  const { user } = useAuth();
  const { colors, radius } = useAppTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [flats, setFlats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.mobile) return;
    setRefreshing(true);
    try {
      const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
      setFlats(res.data || []);
    } catch {
      setFlats([]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.mobile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
    >
      <SectionHeader title="My Properties" subtitle="Portfolio of flats registered under your name." />

      {flats.length === 0 && !refreshing ? (
        <EmptyState
          icon="home-city"
          title="No properties found"
          subtitle="We couldn't find any flats registered to your primary mobile number."
        />
      ) : (
        flats.map((flat) => (
          <Surface key={flat.property_id} level={1} style={styles.flatCard}>
            <View style={styles.flatHeader}>
              <View style={styles.flatTitleRow}>
                <View style={styles.titleInfo}>
                  <Text style={[styles.flatTitle, { color: colors.onSurface }]}>{flat.block} · {flat.flat}</Text>
                  <Badge
                    label={flat.is_occupied ? (flat.occupied_by === 'TENANT' ? 'Leased' : 'Self-occupied') : 'Vacant'}
                    tone={flat.is_occupied ? 'success' : 'warning'}
                  />
                </View>
              </View>

              {flat.tenant_name ? (
                <Pressable
                  onPress={() => navigation.navigate('TenantDetails', { propertyId: flat.property_id, readOnly: true, snapshot: flat })}
                  style={({pressed}) => [styles.tenantRow, { backgroundColor: colors.surfaceContainerHighest, opacity: pressed ? 0.8 : 1 }]}
                >
                  <MaterialCommunityIcons name="home-account" size={20} color={colors.primary} />
                  <Text style={[styles.tenantName, { color: colors.onSurface }]}>Resident: {flat.tenant_name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
                </Pressable>
              ) : (
                 <View style={[styles.tenantRow, { backgroundColor: colors.surfaceContainerLow }]}>
                    <MaterialCommunityIcons name="home-outline" size={20} color={colors.onSurfaceVariant} />
                    <Text style={[styles.tenantName, { color: colors.onSurfaceVariant }]}>Property currently vacant</Text>
                 </View>
              )}
            </View>

            <View style={styles.historySection}>
              <SectionHeader
                title="Recent Collections"
                actionLabel="Details"
                onAction={() => navigation.navigate('PaymentsList', { filter: { block: flat.block, flat: flat.flat } })}
              />
              {flat.payment_history?.length > 0 ? (
                <View style={styles.paymentList}>
                  {flat.payment_history.slice(0, 3).map((p, idx) => (
                    <ActivityRow
                      key={`${p.year}-${p.month}`}
                      title={`${p.month}/${p.year}`}
                      subtitle={`${p.mode_of_payment} · ${fmtAmount(p.amount)}`}
                      icon="cash-check"
                      tone="success"
                      isLast={idx === 2 || idx === flat.payment_history.length - 1}
                    />
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyHistory, { color: colors.onSurfaceVariant }]}>No payment records found for this unit.</Text>
              )}
            </View>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flatCard: { marginBottom: 20, padding: 0, borderRadius: radius.xl, overflow: 'hidden' },
  flatHeader: { padding: 20 },
  flatTitleRow: { marginBottom: 16 },
  titleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flatTitle: { ...typography.headlineSmall, fontWeight: '700' },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg },
  tenantName: { flex: 1, ...typography.bodyMedium, fontWeight: '700' },
  historySection: { padding: 20, paddingTop: 0 },
  paymentList: { marginTop: 4 },
  emptyHistory: { ...typography.bodySmall, fontStyle: 'italic', marginTop: 8 },
});
