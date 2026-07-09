import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  Badge,
  Surface,
} from '../components/DesignSystem';

export default function DirectoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, radius } = useAppTheme();
  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';

  return (
    <Page>
      {/* ── Hero ── */}
      <Surface level={2} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons name="account-group" size={32} color={colors.onPrimaryContainer} />
          </View>
          <View style={styles.heroBadges}>
            <Badge label="Directory" tone="info" />
            {canManage && <Badge label="Admin" tone="success" />}
          </View>
        </View>

        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Community Members</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Access our comprehensive directory of owners, residents, and management staff.
        </Text>
      </Surface>

      {/* ── Resident Access ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Browse Members"
          subtitle="Profiles and contact information."
        />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Owners"
            subtitle="Browse property owners"
            icon="account-tie"
            tone="primary"
            onPress={() => navigation.navigate('OwnersList')}
          />
          <QuickAction
            title="Residents"
            subtitle="View current residents"
            icon="home-account"
            tone="secondary"
            onPress={() => navigation.navigate('TenantsList')}
          />
        </View>
      </View>

      {/* ── Lookup Tools ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Management Tools"
          subtitle="Utility and lookups."
        />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Vehicle Lookup"
            subtitle="Identify vehicles"
            icon="car-search"
            tone="secondary"
            onPress={() => navigation.navigate('VehicleSearch')}
          />
          <QuickAction
            title="Helpdesk"
            subtitle="Contact support"
            icon="lifebuoy"
            tone="primary"
            onPress={() => navigation.navigate('Helpdesk')}
          />
        </View>
      </View>

      {/* ── Admin Tools ── */}
      {canManage && (
        <View style={styles.section}>
          <SectionHeader
            title="Admin Actions"
            subtitle="Create and manage records."
          />
          <View style={styles.actionGrid}>
            <QuickAction
              title="Add Owner"
              subtitle="Register new owner"
              icon="account-plus"
              tone="primary"
              onPress={() => navigation.navigate('AddOwner')}
            />
            <QuickAction
              title="Add Tenant"
              subtitle="Register new tenant"
              icon="account-plus-outline"
              tone="secondary"
              onPress={() => navigation.navigate('AddTenant')}
            />
          </View>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 24,
    borderRadius: radius.xl,
    marginBottom: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadges: {
    gap: 8,
    alignItems: 'flex-end',
  },
  heroTitle: {
    ...typography.headlineMedium,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    lineHeight: 24,
  },
  section: {
    marginTop: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
