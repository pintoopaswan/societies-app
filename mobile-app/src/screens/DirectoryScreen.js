import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { radius, shadow, typography, useAppTheme } from '../lib/theme';

function SectionHeader({ title, subtitle }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MenuCard({ title, subtitle, icon, onPress, tone = 'primary' }) {
  const { colors } = useAppTheme();
  const palette = {
    primary: { bg: 'rgba(37, 99, 235, 0.10)', fg: colors.primaryBlue },
    accent: { bg: 'rgba(124, 58, 237, 0.10)', fg: colors.accent },
    success: { bg: 'rgba(22, 163, 74, 0.10)', fg: colors.success },
    warning: { bg: 'rgba(217, 119, 6, 0.12)', fg: colors.warning },
    danger: { bg: 'rgba(239, 68, 68, 0.10)', fg: colors.danger },
    neutral: { bg: colors.surfaceSoft, fg: colors.text },
  }[tone] || { bg: colors.surfaceSoft, fg: colors.text };

  return (
    <TouchableOpacity activeOpacity={0.92} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
        <MaterialCommunityIcons name={icon} size={24} color={palette.fg} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardSub, { color: colors.muted }]}>{subtitle}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardLink, { color: colors.primaryBlue }]}>Open</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primaryBlue} />
      </View>
    </TouchableOpacity>
  );
}

export default function DirectoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const canManage = String(user?.role || '').toUpperCase() === 'ADMIN';

  return (
    <Page>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <Text style={[styles.heroKicker, { color: colors.muted }]}>DIRECTORY</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>A polished shortcut hub for residents and residents’ homes</Text>
        <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
          Quickly jump into owners, tenants, vehicle lookup, and admin entry points from a single elegant screen.
        </Text>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Resident Access" subtitle="Most-used directory flows, styled as premium cards." />
        <View style={styles.grid}>
          <MenuCard title="Owners" subtitle="Open owners list" icon="account-tie" onPress={() => navigation.navigate('OwnersList')} tone="primary" />
          <MenuCard title="Residents" subtitle="Open tenants list" icon="home-account" onPress={() => navigation.navigate('TenantsList')} tone="accent" />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Lookup Tools" subtitle="Fast reference tools for vehicles and home mapping." />
        <View style={styles.grid}>
          <MenuCard title="Search Vehicle" subtitle="Find flat by vehicle number" icon="car-search" onPress={() => navigation.navigate('VehicleSearch')} tone="warning" />
          <MenuCard title="Complaints" subtitle="Track resident issues" icon="ticket-outline" onPress={() => navigation.navigate('Complaints')} tone="danger" />
        </View>
      </View>

      {canManage ? (
        <View style={styles.sectionBlock}>
          <SectionHeader title="Admin Tools" subtitle="Resident management actions for administrators." />
          <View style={styles.grid}>
            <MenuCard title="Add Owner" subtitle="Create owner details" icon="account-plus" onPress={() => navigation.navigate('AddOwner')} tone="primary" />
            <MenuCard title="Add Tenant" subtitle="Create tenant details" icon="account-plus-outline" onPress={() => navigation.navigate('AddTenant')} tone="accent" />
          </View>
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroGlowA: {
    position: 'absolute',
    top: -30,
    right: -14,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(37, 99, 235, 0.07)',
  },
  heroGlowB: {
    position: 'absolute',
    bottom: -38,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    fontFamily: typography.heading,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    maxWidth: 330,
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
    fontFamily: typography.heading,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48.5%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    minHeight: 156,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  cardSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  cardLink: {
    fontSize: 12,
    fontWeight: '800',
  },
});
