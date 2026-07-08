import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  QuickAction,
  Badge,
  Surface,
} from '../components/DesignSystem';

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DirectoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, radius } = useAppTheme();
  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';

  return (
    <Page>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Surface style={styles.heroCard}>
        {/* decorative blobs */}
        <View style={[styles.blobA, { backgroundColor: colors.accentSoft }]} />
        <View style={[styles.blobB, { backgroundColor: colors.primaryBlue + '10' }]} />

        {/* kicker pills */}
        <View style={styles.heroPillsRow}>
          <Badge label="DIRECTORY" tone="info" />
          {canManage && (
            <Badge label="Admin" tone="success" />
          )}
        </View>

        <Text style={[styles.heroTitle, { color: colors.text }]}>Residents & homes</Text>
        <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
          Jump into owners, tenants, vehicle lookup, and admin entry points from one elegant hub.
        </Text>

        {/* quick-stat identity row */}
        <View style={styles.identityRow}>
          <View style={[styles.identityCard, { backgroundColor: colors.surfaceSoft }]}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={colors.primaryBlue} />
            <Text style={[styles.identityLabel, { color: colors.muted }]}>SECTION</Text>
            <Text style={[styles.identityValue, { color: colors.text }]}>Directory</Text>
            <Text style={[styles.identityHint, { color: colors.muted }]}>Residents & lookup</Text>
          </View>
          <View style={[styles.identityCard, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color={colors.accent} />
            <Text style={[styles.identityLabel, { color: colors.accent }]}>ACCESS</Text>
            <Text style={[styles.identityValue, { color: colors.accent }]}>
              {canManage ? 'Admin' : 'Resident'}
            </Text>
            <Text style={[styles.identityHint, { color: colors.accent + '99' }]}>
              {canManage ? 'Full management' : 'Read-only view'}
            </Text>
          </View>
        </View>
      </Surface>

      {/* ── Resident Access ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Resident Access"
          subtitle="Most-used directory flows."
        />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Owners"
            subtitle="Browse and view owner profiles"
            icon="account-tie"
            tone="default"
            onPress={() => navigation.navigate('OwnersList')}
          />
          <QuickAction
            title="Residents"
            subtitle="Browse and view tenant profiles"
            icon="home-account"
            tone="indigo"
            onPress={() => navigation.navigate('TenantsList')}
          />
        </View>
      </View>

      {/* ── Lookup Tools ──────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Lookup Tools"
          subtitle="Fast reference tools for vehicles and issues."
        />
        <View style={styles.actionGrid}>
          <QuickAction
            title="Search Vehicle"
            subtitle="Find flat by vehicle number"
            icon="car-search"
            tone="warning"
            onPress={() => navigation.navigate('VehicleSearch')}
          />
          <QuickAction
            title="Complaints"
            subtitle="Track and raise resident issues"
            icon="ticket-outline"
            tone="danger"
            onPress={() => navigation.navigate('Complaints')}
          />
        </View>
      </View>

      {/* ── Admin Tools ───────────────────────────────────────────────────────── */}
      {canManage ? (
        <View style={styles.section}>
          <SectionHeader
            title="Admin Tools"
            subtitle="Resident management actions."
          />
          <View style={styles.actionGrid}>
            <QuickAction
              title="Add Owner"
              subtitle="Create a new owner record"
              icon="account-plus"
              tone="default"
              onPress={() => navigation.navigate('AddOwner')}
            />
            <QuickAction
              title="Add Tenant"
              subtitle="Create a new tenant record"
              icon="account-plus-outline"
              tone="indigo"
              onPress={() => navigation.navigate('AddTenant')}
            />
          </View>
        </View>
      ) : null}

    </Page>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroCard: {
    padding: 20,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  blobB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },

  // ── Identity row (inside hero) ────────────────────────────────────────────
  identityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  identityCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 3,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  identityValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  identityHint: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },

  // ── Action grid (MenuCard) ────────────────────────────────────────────────
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});