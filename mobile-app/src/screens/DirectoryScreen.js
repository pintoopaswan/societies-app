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

// ─── Design tokens (mirrors DashboardScreen) ──────────────────────────────────

const PALETTE = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',

  ink: '#0F0F10',
  inkSecondary: '#6B7280',
  inkTertiary: '#9CA3AF',

  blue: '#2563EB',
  blueSoft: '#EFF4FF',
  blueMid: '#DBEAFE',

  indigo: '#4F46E5',
  indigoSoft: '#EEF2FF',

  emerald: '#059669',
  emeraldSoft: '#ECFDF5',

  amber: '#D97706',
  amberSoft: '#FFFBEB',

  rose: '#E11D48',
  roseSoft: '#FFF1F2',

  slate: '#475569',
  slateSoft: '#F1F5F9',

  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
};

const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
};

const ACTION_PALETTE = {
  blue:   { bg: PALETTE.blueSoft,    fg: PALETTE.blue,    ring: PALETTE.blueMid  },
  indigo: { bg: PALETTE.indigoSoft,  fg: PALETTE.indigo,  ring: '#C7D2FE'        },
  green:  { bg: PALETTE.emeraldSoft, fg: PALETTE.emerald, ring: '#A7F3D0'        },
  amber:  { bg: PALETTE.amberSoft,   fg: PALETTE.amber,   ring: '#FDE68A'        },
  red:    { bg: PALETTE.roseSoft,    fg: PALETTE.rose,    ring: '#FECDD3'        },
  slate:  { bg: PALETTE.slateSoft,   fg: PALETTE.slate,   ring: '#CBD5E1'        },
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill badge — identical to Dashboard's Pill */
function Pill({ label, color = PALETTE.blue, bg = PALETTE.blueSoft, icon }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={11} color={color} style={{ marginRight: 4 }} />
      ) : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Section header — identical to Dashboard's SectionHeader */
function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? (
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

/**
 * MenuCard — rebuilt on top of Dashboard's ActionCard pattern.
 * Same top accent bar, icon treatment, scale press feedback, and chevron.
 */
function MenuCard({ title, subtitle, icon, onPress, tone = 'blue' }) {
  const p = ACTION_PALETTE[tone] || ACTION_PALETTE.blue;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {/* top accent bar */}
      <View style={[styles.actionAccentBar, { backgroundColor: p.fg, opacity: 0.12 }]} />

      <View style={[styles.actionIconWrap, { backgroundColor: p.bg, borderColor: p.ring }]}>
        <MaterialCommunityIcons name={icon} size={22} color={p.fg} />
      </View>

      <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>

      {/* subtle chevron */}
      <View style={styles.actionChevronWrap}>
        <MaterialCommunityIcons name="arrow-right" size={14} color={p.fg} />
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DirectoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';

  return (
    <Page style={{ backgroundColor: PALETTE.bg }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        {/* decorative blobs */}
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        {/* kicker pills */}
        <View style={styles.heroPillsRow}>
          <Pill label="DIRECTORY" color={PALETTE.indigo} bg={PALETTE.indigoSoft} />
          {canManage && (
            <Pill label="Admin" color={PALETTE.emerald} bg={PALETTE.emeraldSoft} icon="shield-check-outline" />
          )}
        </View>

        <Text style={styles.heroTitle}>Residents &amp; homes</Text>
        <Text style={styles.heroSubtitle}>
          Jump into owners, tenants, vehicle lookup, and admin entry points from one elegant hub.
        </Text>

        {/* quick-stat identity row */}
        <View style={styles.identityRow}>
          <View style={styles.identityCard}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={PALETTE.blue} />
            <Text style={styles.identityLabel}>SECTION</Text>
            <Text style={styles.identityValue}>Directory</Text>
            <Text style={styles.identityHint}>Residents &amp; lookup</Text>
          </View>
          <View style={[styles.identityCard, { backgroundColor: PALETTE.indigoSoft }]}>
            <MaterialCommunityIcons name="shield-account-outline" size={16} color={PALETTE.indigo} />
            <Text style={[styles.identityLabel, { color: PALETTE.indigo }]}>ACCESS</Text>
            <Text style={[styles.identityValue, { color: PALETTE.indigo }]}>
              {canManage ? 'Admin' : 'Resident'}
            </Text>
            <Text style={styles.identityHint}>
              {canManage ? 'Full management' : 'Read-only view'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Resident Access ───────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title="Resident Access"
          subtitle="Most-used directory flows."
        />
        <View style={styles.actionGrid}>
          <MenuCard
            title="Owners"
            subtitle="Browse and view owner profiles"
            icon="account-tie"
            tone="blue"
            onPress={() => navigation.navigate('OwnersList')}
          />
          <MenuCard
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
          <MenuCard
            title="Search Vehicle"
            subtitle="Find flat by vehicle number"
            icon="car-search"
            tone="amber"
            onPress={() => navigation.navigate('VehicleSearch')}
          />
          <MenuCard
            title="Complaints"
            subtitle="Track and raise resident issues"
            icon="ticket-outline"
            tone="red"
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
            <MenuCard
              title="Add Owner"
              subtitle="Create a new owner record"
              icon="account-plus"
              tone="blue"
              onPress={() => navigation.navigate('AddOwner')}
            />
            <MenuCard
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
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xxl,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  blobA: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(79, 70, 229, 0.07)',
  },
  blobB: {
    position: 'absolute',
    bottom: -60,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
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
    color: PALETTE.ink,
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Identity row (inside hero) ────────────────────────────────────────────
  identityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  identityCard: {
    flex: 1,
    backgroundColor: PALETTE.surfaceMuted,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 3,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PALETTE.inkTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  identityValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.3,
  },
  identityHint: {
    fontSize: 12,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Pill ──────────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PALETTE.ink,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },

  // ── Action grid (MenuCard) ────────────────────────────────────────────────
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '48.5%',
    backgroundColor: PALETTE.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    minHeight: 148,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PALETTE.border,
    ...CARD_SHADOW,
  },
  actionAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
    marginTop: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.ink,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: PALETTE.inkSecondary,
  },
  actionChevronWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
});