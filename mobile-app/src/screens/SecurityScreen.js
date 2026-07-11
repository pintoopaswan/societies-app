import React from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  QuickAction,
  SettingsRow,
  Badge,
} from '../components/DesignSystem';

export default function SecurityScreen() {
  const { colors, radius } = useAppTheme();

  const contacts = [
    { name: 'Main Gate', phone: '+91 98765 43210', icon: 'shield-account' },
    { name: 'Night Shift', phone: '+91 98765 43211', icon: 'moon-waning-crescent' },
    { name: 'Supervisor', phone: '+91 98765 43212', icon: 'account-tie' },
  ];

  const call = (num) => Linking.openURL(`tel:${num.replace(/\s/g, '')}`);

  return (
    <Page>
      <Surface level={2} style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: colors.errorContainer }]}>
          <MaterialCommunityIcons name="shield-check" size={32} color={colors.onErrorContainer} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Security Desk</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Quick access to society guards and emergency response services.
        </Text>
      </Surface>

      <View style={styles.emergency}>
        <QuickAction
          title="Panic Alert"
          subtitle="Call security"
          icon="alert-octagon"
          tone="primary"
          onPress={() => Linking.openURL('tel:100')}
        />
        <QuickAction
          title="Fire Station"
          subtitle="Emergency"
          icon="fire-truck"
          tone="secondary"
          onPress={() => Linking.openURL('tel:101')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Guard Contacts" subtitle="Direct lines to security personnel." />
        <Surface level={1} style={{ padding: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
          {contacts.map((c, idx) => (
            <SettingsRow
              key={c.name}
              icon={c.icon}
              label={c.name}
              value={c.phone}
              tone="primary"
              isLast={idx === contacts.length - 1}
              onPress={() => call(c.phone)}
            />
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Visitor Policy" />
        <Surface level={1} style={styles.policyCard}>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.onSurface }]}>All visitors must register at the main entry gate.</Text>
          </View>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.onSurface }]}>Delivery partners are permitted until 10:30 PM.</Text>
          </View>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.onSurface }]}>Internal parking is strictly for registered residents.</Text>
          </View>
        </Surface>
      </View>

      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 24, borderRadius: radius.xxl, marginBottom: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { ...typography.bodyLarge, lineHeight: 22 },
  emergency: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  section: { marginTop: 24 },
  policyCard: { padding: 20, gap: 16, borderRadius: radius.xl },
  policyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  policyText: { flex: 1, ...typography.bodyMedium, lineHeight: 20 },
});
