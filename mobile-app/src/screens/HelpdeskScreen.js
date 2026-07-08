import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  SettingsRow,
} from '../components/DesignSystem';

export default function HelpdeskScreen() {
  const { colors, radius } = useAppTheme();

  const contacts = [
    { name: 'Society Manager', role: 'Operations', phone: '+91 98765 00001', icon: 'account-tie' },
    { name: 'Electrician', role: 'Maintenance', phone: '+91 98765 00002', icon: 'lightning-bolt' },
    { name: 'Plumber', role: 'Maintenance', phone: '+91 98765 00003', icon: 'pipe-leak' },
    { name: 'Estate Office', role: 'Admin', phone: '+91 98765 00004', icon: 'office-building' },
  ];

  const faqs = [
    { q: 'How to pay maintenance?', a: 'Go to Payments Hub and use the QR code or UPI ID.' },
    { q: 'How to register a vehicle?', a: 'Update your vehicle list in the Profile section.' },
    { q: 'Where to report issues?', a: 'Use the Complaints section to raise a ticket.' },
  ];

  const call = (num) => Linking.openURL(`tel:${num.replace(/\s/g, '')}`);

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Support</Text>
        <Text style={[styles.title, { color: colors.text }]}>Helpdesk</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Need assistance? Reach out to the society management or maintenance team.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Emergency Contacts" />
        <Surface style={{ padding: 0 }}>
          {contacts.map((c, idx) => (
            <SettingsRow
              key={c.name}
              icon={c.icon}
              label={c.name}
              value={`${c.role} · ${c.phone}`}
              tone="blue"
              isLast={idx === contacts.length - 1}
              onPress={() => call(c.phone)}
            />
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Frequently Asked Questions" />
        {faqs.map((f, idx) => (
          <Surface key={idx} style={styles.faqCard}>
            <Text style={[styles.faqQ, { color: colors.text }]}>{f.q}</Text>
            <Text style={[styles.faqA, { color: colors.muted }]}>{f.a}</Text>
          </Surface>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 8, lineHeight: 22 },
  section: { marginTop: 24 },
  faqCard: { padding: 16, marginBottom: 12 },
  faqQ: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  faqA: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
});
