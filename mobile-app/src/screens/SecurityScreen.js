import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  QuickAction,
  SettingsRow,
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
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Assistance</Text>
        <Text style={[styles.title, { color: colors.text }]}>Security Desk</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Quick access to society guards and emergency contacts.</Text>
      </View>

      <View style={styles.emergency}>
        <QuickAction
          title="Panic Alert"
          subtitle="Notify security immediately"
          icon="alert-octagon"
          tone="danger"
          onPress={() => Linking.openURL('tel:100')}
        />
        <QuickAction
          title="Fire Station"
          subtitle="Emergency fire services"
          icon="fire-truck"
          tone="warning"
          onPress={() => Linking.openURL('tel:101')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Guard Contacts" />
        <Surface style={{ padding: 0 }}>
          {contacts.map((c, idx) => (
            <SettingsRow
              key={c.name}
              icon={c.icon}
              label={c.name}
              value={c.phone}
              tone="blue"
              isLast={idx === contacts.length - 1}
              onPress={() => call(c.phone)}
            />
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Visitor Policy" />
        <Surface style={styles.policyCard}>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.text }]}>Visitors must register at the gate.</Text>
          </View>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.text }]}>Delivery partners allowed until 10 PM.</Text>
          </View>
          <View style={styles.policyRow}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.policyText, { color: colors.text }]}>Internal parking for residents only.</Text>
          </View>
        </Surface>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 8, lineHeight: 22 },
  emergency: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  section: { marginTop: 24 },
  policyCard: { padding: 16, gap: 14 },
  policyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  policyText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
