import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';

const ROLES = ['OWNER', 'TENANT', 'ADMIN'];
const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function PendingRequestEditScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { approveRegistration, rejectRegistration } = useAuth();
  const request = route.params?.request;
  const [role, setRole] = useState('TENANT');
  const [block, setBlock] = useState(request?.block || BLOCKS[0]);
  const [flat, setFlat] = useState(request?.flat || FLATS[0]);

  const approve = async () => {
    if (!role) {
      Alert.alert('Validation', 'Role is mandatory.');
      return;
    }
    try {
      await approveRegistration(request.id, { role, block, flat });
      Alert.alert('Approved', 'Request approved successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Unable to approve', e.message || 'Please try again.');
    }
  };

  const reject = async () => {
    await rejectRegistration(request.id);
    Alert.alert('Rejected', 'Request rejected.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  if (!request) return <Page><Text>Request not found.</Text></Page>;

  return (
    <Page>
      <Text style={styles.title}>Pending Request</Text>
      <Text style={styles.meta}>{request.name}</Text>
      <Text style={styles.meta}>{request.email} | {request.mobile}</Text>

      <Text style={styles.label}>Role (Mandatory)</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={role} onValueChange={setRole}>
          {ROLES.map((r) => <Picker.Item key={r} label={r} value={r} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Block (Optional)</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={block} onValueChange={setBlock}>
          {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Flat (Optional)</Text>
      <View style={styles.pickWrap}>
        <Picker selectedValue={flat} onValueChange={setFlat}>
          {FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}
        </Picker>
      </View>

      <TouchableOpacity style={styles.approveBtn} onPress={approve}><Text style={styles.btnTxt}>Approve Request</Text></TouchableOpacity>
      <TouchableOpacity style={styles.rejectBtn} onPress={reject}><Text style={styles.rejectTxt}>Reject Request</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  meta: { color: '#60788f', marginTop: 2 },
  label: { color: '#5c738c', fontWeight: '700', marginTop: 8 },
  pickWrap: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, marginTop: 4 },
  approveBtn: { backgroundColor: '#1f6fb2', paddingVertical: 11, borderRadius: 10, marginTop: 12 },
  btnTxt: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  rejectBtn: { backgroundColor: '#fff1f1', paddingVertical: 11, borderRadius: 10, marginTop: 8 },
  rejectTxt: { color: '#c53030', textAlign: 'center', fontWeight: '700' },
});
