import React from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  SettingsRow,
  Badge,
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
    { q: 'How to pay maintenance?', a: 'Go to the Payments tab and use the provided QR code or UPI details.' },
    { q: 'How to register a vehicle?', a: 'You can update your vehicle list directly from your Profile settings.' },
    { q: 'Where to report issues?', a: 'Use the Complaints section in the side menu to raise a formal ticket.' },
  ];

  const call = (num) => Linking.openURL(`tel:${num.replace(/\s/g, '')}`);

  return (
    <Page>
      <Surface level={2} style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryContainer }]}>
          <MaterialCommunityIcons name="lifebuoy" size={32} color={colors.onPrimaryContainer} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Society Helpdesk</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Reach out to the management or maintenance team for any assistance.
        </Text>
      </Surface>

      <View style={styles.section}>
        <SectionHeader title="Emergency Contacts" subtitle="Available 24/7 for urgent matters." />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          {contacts.map((c, idx) => (
            <SettingsRow
              key={c.name}
              icon={c.icon}
              label={c.name}
              value={`${c.role} · ${c.phone}`}
              tone="primary"
              isLast={idx === contacts.length - 1}
              onPress={() => call(c.phone)}
            />
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Common Questions" />
        {faqs.map((f, idx) => (
          <Surface key={idx} level={1} style={styles.faqCard}>
            <View style={styles.faqHeader}>
              <Badge label="FAQ" tone="info" />
              <Text style={[styles.faqQ, { color: colors.onSurface }]}>{f.q}</Text>
            </View>
            <Text style={[styles.faqA, { color: colors.onSurfaceVariant }]}>{f.a}</Text>
          </Surface>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 24, borderRadius: radius.xxl, marginBottom: 8 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { ...typography.bodyLarge, lineHeight: 22 },
  section: { marginTop: 24 },
  faqCard: { padding: 20, marginBottom: 12, borderRadius: radius.xl, gap: 12 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQ: { flex: 1, ...typography.titleMedium, fontWeight: '700' },
  faqA: { ...typography.bodyMedium, lineHeight: 20, paddingLeft: 4 },
});
