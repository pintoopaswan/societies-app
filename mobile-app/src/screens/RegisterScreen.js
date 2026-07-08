import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { toIsoDate, safeDateFromIso } from '../lib/date';
import { useAppTheme } from '../lib/theme';
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
  const { colors } = useAppTheme();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="JOIN THE COMMUNITY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Submit your details for society registration.</Text>
        </View>

        <Surface style={styles.card}>
          <FormField label="Full Name*">
            <FormInput placeholder="John Doe" value={form.name} onChangeText={(v) => set('name', v)} />
          </FormField>

          <View style={styles.grid}>
            <FormField label="Mobile*" style={{ flex: 1 }}>
              <FormInput placeholder="10 digit" value={form.mobile} onChangeText={(v) => set('mobile', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={10} />
            </FormField>
            <View style={{ width: 10 }} />
            <FormField label="Block" style={{ flex: 1 }}>
              <FormPicker selectedValue={form.block} onValueChange={(v) => set('block', v)} items={BLOCKS.map(b => ({ label: b, value: b }))} />
            </FormField>
          </View>

          <FormField label="Email Address*">
            <FormInput placeholder="john@example.com" value={form.email} onChangeText={(v) => set('email', v)} autoCapitalize="none" keyboardType="email-address" />
          </FormField>

          <FormField label="Flat Number">
            <FormPicker selectedValue={form.flat} onValueChange={(v) => set('flat', v)} items={FLATS.map(f => ({ label: f, value: f }))} />
          </FormField>

          <FormField label="Password*">
            <FormInput placeholder="••••••••" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
          </FormField>
          <FormField label="Confirm Password*">
            <FormInput placeholder="••••••••" value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secureTextEntry />
          </FormField>

          <FormField label="Living From">
            <FormButton title={form.living_from} tone="secondary" onPress={() => setShowDate(true)} icon="calendar-outline" />
            {showDate && (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(e, d) => { setShowDate(false); if (d) set('living_from', toIsoDate(d)); }}
              />
            )}
          </FormField>

          <FormField label="Verification Documents" isLast>
            <View style={{ gap: 8 }}>
              <FormButton
                title={rentDocument ? `Rent: ${rentDocument.name}` : 'Upload Rent Agreement'}
                tone="secondary"
                icon="file-document-outline"
                onPress={() => pickDoc(setRentDocument)}
              />
              <FormButton
                title={idCardDocument ? `ID: ${idCardDocument.name}` : 'Upload ID Card'}
                tone="secondary"
                icon="account-box-outline"
                onPress={() => pickDoc(setIdCardDocument)}
              />
            </View>
          </FormField>
        </Surface>

        <View style={styles.actions}>
          <FormButton title="Submit Request" onPress={onSubmit} loading={loading} />
          <FormButton title="Back to Login" onPress={() => navigation.navigate('Login')} tone="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 24, paddingBottom: 40, gap: 16 },
  hero: { gap: 8, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  card: { padding: 20 },
  grid: { flexDirection: 'row' },
  actions: { gap: 12, marginTop: 8 },
});
