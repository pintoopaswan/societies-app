import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
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
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primaryBlue} />}
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Portfolio</Text>
        <Text style={[styles.title, { color: colors.text }]}>My Flats</Text>
      </View>

      {flats.length === 0 && !refreshing ? (
        <EmptyState
          icon="home-city-outline"
          title="No flats found"
          subtitle="We couldn't find any flats registered to your mobile number."
        />
      ) : (
        flats.map((flat) => (
          <Surface key={flat.property_id} style={styles.flatCard}>
            <View style={styles.flatHeader}>
              <View style={styles.flatTitleRow}>
                <Text style={[styles.flatTitle, { color: colors.text }]}>{flat.block} · {flat.flat}</Text>
                <Badge
                  label={flat.is_occupied ? (flat.occupied_by === 'TENANT' ? 'Leased' : 'Self-occupied') : 'Vacant'}
                  tone={flat.is_occupied ? 'success' : 'warning'}
                />
              </View>
              {flat.tenant_name ? (
                <Pressable
                  onPress={() => navigation.navigate('TenantDetails', { propertyId: flat.property_id, readOnly: true, snapshot: flat })}
                  style={styles.tenantRow}
                >
                  <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.muted} />
                  <Text style={[styles.tenantName, { color: colors.muted }]}>Tenant: {flat.tenant_name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.historySection}>
              <SectionHeader
                title="Recent Payments"
                actionLabel="View all"
                onAction={() => navigation.navigate('PaymentsList', { filter: { block: flat.block, flat: flat.flat } })}
              />
              {flat.payment_history?.length > 0 ? (
                flat.payment_history.slice(0, 3).map((p, idx) => (
                  <ActivityRow
                    key={`${p.year}-${p.month}`}
                    title={`${p.month}/${p.year}`}
                    subtitle={`${p.mode_of_payment} · ${fmtAmount(p.amount)}`}
                    icon="cash-check"
                    tone="payment"
                    isLast={idx === 2 || idx === flat.payment_history.length - 1}
                  />
                ))
              ) : (
                <Text style={[styles.emptyHistory, { color: colors.muted }]}>No recent payments found.</Text>
              )}
            </View>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  flatCard: { marginBottom: 16, padding: 0 },
  flatHeader: { padding: 16 },
  flatTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  flatTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  tenantRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tenantName: { flex: 1, fontSize: 14, fontWeight: '600' },
  divider: { height: 1 },
  historySection: { padding: 16, paddingTop: 12 },
  emptyHistory: { fontSize: 13, fontWeight: '500', fontStyle: 'italic', marginTop: 4 },
});
