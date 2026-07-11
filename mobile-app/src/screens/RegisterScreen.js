import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { toIsoDate, safeDateFromIso } from '../lib/date';
import { useAppTheme, typography } from '../lib/theme';
import {
  Badge,
  Surface,
  FormField,
  FormInput,
  FormPicker,
  FormButton,
} from '../components/DesignSystem';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { registerRequest } = useAuth();
  const { colors, radius } = useAppTheme();

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    block: BLOCKS[0],
    flat: FLATS[0],
    living_from: toIsoDate(new Date()),
  });
  const [rentDocument, setRentDocument] = useState(null);
  const [idCardDocument, setIdCardDocument] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickDoc = async (setter) => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled) return;
    setter(res.assets?.[0] || null);
  };

  const onSubmit = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Name is required.');
    if (!form.mobile.trim()) return Alert.alert('Validation', 'Mobile is required.');
    if (!form.password.trim()) return Alert.alert('Validation', 'Password is required.');
    if (form.password !== form.confirmPassword) {
      return Alert.alert('Validation', 'Passwords do not match.');
    }

    try {
      setLoading(true);
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, String(v || '')));
      if (rentDocument?.uri) body.append('rent_document', { uri: rentDocument.uri, name: rentDocument.name || 'rent.pdf', type: rentDocument.mimeType || 'application/octet-stream' });
      if (idCardDocument?.uri) body.append('id_card_document', { uri: idCardDocument.uri, name: idCardDocument.name || 'id.pdf', type: idCardDocument.mimeType || 'application/octet-stream' });

      await registerRequest(body);
      Alert.alert('Success', 'Request submitted for approval.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="JOIN THE COMMUNITY" tone="info" />
          <Text style={[styles.title, { color: colors.onSurface }]}>Resident Registration</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>Submit your details to the society management for secure access.</Text>
        </View>

        <Surface level={1} style={styles.card}>
          <FormField label="Full Name">
            <FormInput placeholder="e.g. John Doe" value={form.name} onChangeText={(v) => set('name', v)} />
          </FormField>

          <View style={styles.grid}>
            <View style={{ flex: 1 }}>
              <FormField label="Mobile">
                <FormInput placeholder="10-digit number" value={form.mobile} onChangeText={(v) => set('mobile', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={10} />
              </FormField>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FormField label="Block">
                <FormPicker value={form.block} onValueChange={(v) => set('block', v)} items={BLOCKS.map(b => ({ label: b, value: b }))} />
              </FormField>
            </View>
          </View>

          <FormField label="Email Address">
            <FormInput placeholder="john@example.com" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
          </FormField>

          <FormField label="Flat Number">
            <FormPicker value={form.flat} onValueChange={(v) => set('flat', v)} items={FLATS.map(f => ({ label: f, value: f }))} />
          </FormField>

          <View style={styles.grid}>
            <View style={{ flex: 1 }}>
              <FormField label="Password">
                <FormInput placeholder="••••••••" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
              </FormField>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <FormField label="Confirm">
                <FormInput placeholder="••••••••" value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secureTextEntry />
              </FormField>
            </View>
          </View>

          <FormField label="Resident Since">
            <FormButton title={form.living_from} tone="secondary" onPress={() => setShowDate(true)} icon="calendar" />
            {showDate && (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(e, d) => { setShowDate(false); if (d) set('living_from', toIsoDate(d)); }}
              />
            )}
          </FormField>

          <FormField label="Verification Proofs" isLast>
            <View style={{ gap: 12 }}>
              <FormButton
                title={rentDocument ? rentDocument.name : 'Rent Agreement'}
                tone="outlined"
                icon="file-document"
                onPress={() => pickDoc(setRentDocument)}
              />
              <FormButton
                title={idCardDocument ? idCardDocument.name : 'Identification Card'}
                tone="outlined"
                icon="account-box"
                onPress={() => pickDoc(setIdCardDocument)}
              />
            </View>
          </FormField>
        </Surface>

        <View style={styles.actions}>
          <FormButton title="Request Access" onPress={onSubmit} loading={loading} />
          <FormButton title="Return to Login" onPress={() => navigation.navigate('Login')} tone="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 60, gap: 24 },
  hero: { gap: 12, marginBottom: 8 },
  title: { ...typography.headlineSmall, fontWeight: '700' },
  subtitle: { ...typography.bodyLarge, lineHeight: 22 },
  card: { padding: 24, borderRadius: radius.xxl },
  grid: { flexDirection: 'row' },
  actions: { gap: 16 },
});
