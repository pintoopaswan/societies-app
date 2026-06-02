import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { toIsoDate, safeDateFromIso } from '../lib/date';
import { Badge, Surface } from '../components/DesignSystem';
import { useAppTheme } from '../lib/theme';

const BLOCKS = Array.from({ length: 9 }, (_, i) => `Block-${i + 1}`);
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) =>
  Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`)
);

function Field({ label, ...props }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

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
    if (!form.mobile.trim()) return Alert.alert('Validation', 'Mobile Number is required.');
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) return Alert.alert('Validation', 'Mobile Number must be 10 digits.');
    if (!form.email.trim()) return Alert.alert('Validation', 'Email ID is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return Alert.alert('Validation', 'Email ID is invalid.');
    if (!form.password.trim()) return Alert.alert('Validation', 'Password is required.');
    if (!form.confirmPassword.trim()) return Alert.alert('Validation', 'Re-enter Password is required.');
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Password and re-entered password must match.');
      return;
    }

    try {
      setLoading(true);
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, String(v || '')));
      if (rentDocument?.uri) body.append('rent_document', { uri: rentDocument.uri, name: rentDocument.name || 'rent-document.pdf', type: rentDocument.mimeType || 'application/octet-stream' });
      if (idCardDocument?.uri) body.append('id_card_document', { uri: idCardDocument.uri, name: idCardDocument.name || 'id-card-document.pdf', type: idCardDocument.mimeType || 'application/octet-stream' });

      await registerRequest(body);
      Alert.alert('Request submitted', 'Registration request sent to admin for approval.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Unable to submit', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.appBg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Badge label="JOIN THE COMMUNITY" tone="info" />
          <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Submit your request for admin approval and get connected to your flat, dues, and community updates.</Text>
        </View>

        <Surface style={styles.card}>
          <View style={styles.form}>
            <Field label="Name" placeholder="Full name" value={form.name} onChangeText={(v) => set('name', v)} />
            <Field
              label="Mobile number"
              placeholder="10 digit mobile"
              value={form.mobile}
              onChangeText={(v) => set('mobile', v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={10}
            />
            <Field
              label="Email address"
              placeholder="name@example.com"
              value={form.email}
              onChangeText={(v) => set('email', v)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field label="Password" placeholder="Create password" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry />
            <Field label="Confirm password" placeholder="Re-enter password" value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} secureTextEntry />

            <View style={styles.grid2}>
              <View style={{ gap: 6, flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>Block</Text>
                <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Picker selectedValue={form.block} onValueChange={(v) => set('block', v)}>
                    {BLOCKS.map((b) => <Picker.Item key={b} label={b} value={b} />)}
                  </Picker>
                </View>
              </View>
              <View style={{ gap: 6, flex: 1 }}>
                <Text style={[styles.label, { color: colors.muted }]}>Flat</Text>
                <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Picker selectedValue={form.flat} onValueChange={(v) => set('flat', v)}>
                    {FLATS.map((f) => <Picker.Item key={f} label={f} value={f} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: colors.muted }]}>Living from</Text>
              <TouchableOpacity style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowDate(true)}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{form.living_from}</Text>
              </TouchableOpacity>
            </View>
            {showDate ? (
              <DateTimePicker
                value={safeDateFromIso(form.living_from)}
                mode="date"
                onChange={(event, d) => {
                  if (event.type === 'dismissed') { setShowDate(false); return; }
                  if (d) set('living_from', toIsoDate(d));
                  setShowDate(false);
                }}
              />
            ) : null}

            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={() => pickDoc(setRentDocument)}>
              <Text style={[styles.uploadTxt, { color: colors.text }]}>
                {rentDocument?.name ? `Rent/Registry: ${rentDocument.name}` : 'Upload rent agreement / registry'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={() => pickDoc(setIdCardDocument)}>
              <Text style={[styles.uploadTxt, { color: colors.text }]}>
                {idCardDocument?.name ? `ID Card: ${idCardDocument.name}` : 'Upload ID card (Aadhaar)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onSubmit} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit request'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.link, { color: colors.primaryBlue }]}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingTop: 24, paddingBottom: 28, gap: 16 },
  hero: { gap: 10 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  card: { borderRadius: 28, padding: 18 },
  form: { gap: 10 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { borderRadius: 16, borderWidth: 1, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600' },
  pickerBox: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dateField: { minHeight: 50, borderWidth: 1, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 14 },
  uploadBtn: { borderRadius: 16, borderWidth: 1, padding: 14 },
  uploadTxt: { fontSize: 14, fontWeight: '700' },
  button: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  link: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  grid2: { flexDirection: 'row', gap: 10 },
});
