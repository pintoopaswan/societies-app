import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  Surface,
  FormField,
  FormPicker,
  FormButton,
  SectionHeader,
  Badge,
} from '../components/DesignSystem';

const ROLES = ['OWNER', 'TENANT', 'GUARD', 'ADMIN'];
const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function PendingRequestEditScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { colors, radius } = useAppTheme();
  const { approveRegistration, rejectRegistration } = useAuth();
  const request = route.params?.request;

  const [role, setRole] = useState('TENANT');
  const [block, setBlock] = useState(request?.block || BLOCKS[0]);
  const [flat, setFlat] = useState(request?.flat || FLATS[0]);
  const [loading, setLoading] = useState(false);

  const approve = async () => {
    setLoading(true);
    try {
      await approveRegistration(request.id, { role, block, flat });
      Alert.alert('Approved', 'Community access granted successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Approval Failed', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    Alert.alert('Reject Request', 'This applicant will not be granted community access. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await rejectRegistration(request.id);
          Alert.alert('Rejected', 'Request has been discarded.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  if (!request) return <Page><EmptyState title="Not Found" subtitle="Request data is unavailable." /></Page>;

  return (
    <Page>
      <SectionHeader title="Access Review" subtitle="Review and assign roles to the applicant." />

      <Surface level={2} style={styles.heroCard}>
        <View style={styles.heroHeader}>
           <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
             <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>
               {String(request.name || 'U').charAt(0).toUpperCase()}
             </Text>
           </View>
           <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: colors.onSurface }]}>{request.name}</Text>
              <Text style={[styles.heroMeta, { color: colors.onSurfaceVariant }]}>{request.mobile} · {request.email}</Text>
           </View>
        </View>
        <View style={styles.heroBadges}>
          <Badge label={`Applied as: ${request.block} ${request.flat}`} tone="info" />
        </View>
      </Surface>

      <Surface level={1} style={styles.card}>
        <SectionHeader title="Grant Permissions" />

        <FormField label="Assigned Access Role">
          <FormPicker
            value={role}
            onValueChange={setRole}
            items={ROLES.map(r => ({ label: r, value: r }))}
          />
        </FormField>

        <View style={styles.formRow}>
          <View style={{ flex: 1 }}>
            <FormField label="Block">
              <FormPicker value={block} onValueChange={setBlock} items={BLOCKS.map(b => ({ label: b, value: b }))} />
            </FormField>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <FormField label="Flat">
              <FormPicker value={flat} onValueChange={setFlat} items={FLATS.map(f => ({ label: f, value: f }))} />
            </FormField>
          </View>
        </View>
      </Surface>

      <View style={styles.actions}>
        <FormButton title="Grant Access" onPress={approve} loading={loading} icon="check-decagram" />
        <FormButton title="Deny Request" onPress={reject} tone="danger" />
      </View>
      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 24, borderRadius: radius.xxl, marginBottom: 24 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.titleLarge, fontWeight: '700' },
  heroInfo: { flex: 1 },
  heroName: { ...typography.titleLarge, fontWeight: '700' },
  heroMeta: { ...typography.bodySmall, marginTop: 2 },
  heroBadges: { flexDirection: 'row' },
  card: { padding: 24, borderRadius: radius.xl },
  formRow: { flexDirection: 'row' },
  actions: { marginTop: 40, gap: 16 },
});
