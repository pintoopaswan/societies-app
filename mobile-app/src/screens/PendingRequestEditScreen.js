import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  Surface,
  FormField,
  FormPicker,
  FormButton,
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
  const { colors } = useAppTheme();
  const { approveRegistration, rejectRegistration } = useAuth();
  const request = route.params?.request;
  const [role, setRole] = useState('TENANT');
  const [block, setBlock] = useState(request?.block || BLOCKS[0]);
  const [flat, setFlat] = useState(request?.flat || FLATS[0]);
  const [loading, setLoading] = useState(false);

  const approve = async () => {
    if (!role) {
      Alert.alert('Validation', 'Role is mandatory.');
      return;
    }
    setLoading(true);
    try {
      await approveRegistration(request.id, { role, block, flat });
      Alert.alert('Approved', 'Request approved successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Unable to approve', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await rejectRegistration(request.id);
          Alert.alert('Rejected', 'Request rejected.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (e) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  if (!request) return <Page><Text>Request not found.</Text></Page>;

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Approval Flow</Text>
        <Text style={[styles.title, { color: colors.text }]}>{request.name}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>{request.email} · {request.mobile}</Text>
      </View>

      <Surface style={styles.card}>
        <FormField label="Assigned Role*">
          <FormPicker
            value={role}
            onValueChange={setRole}
            items={ROLES.map(r => ({ label: r, value: r }))}
          />
        </FormField>

        <FormField label="Block">
          <FormPicker
            value={block}
            onValueChange={setBlock}
            items={BLOCKS.map(b => ({ label: b, value: b }))}
          />
        </FormField>

        <FormField label="Flat" isLast>
          <FormPicker
            value={flat}
            onValueChange={setFlat}
            items={FLATS.map(f => ({ label: f, value: f }))}
          />
        </FormField>
      </Surface>

      <View style={styles.actions}>
        <FormButton title="Approve Request" onPress={approve} loading={loading} />
        <FormButton title="Reject Request" onPress={reject} tone="danger" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  meta: { fontSize: 15, fontWeight: '500', marginTop: 4 },
  card: { padding: 20 },
  actions: { marginTop: 32, gap: 12 },
});
