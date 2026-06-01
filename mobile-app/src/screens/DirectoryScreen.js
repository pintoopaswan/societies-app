import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { colors, radius, shadow, ui } from '../lib/theme';

function MenuCard({ title, subtitle, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function DirectoryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';

  return (
    <Page>
      <Text style={styles.title}>Directory</Text>
      <View style={styles.grid}>
        <MenuCard
          title="Owners"
          subtitle="Open owners list"
          icon="account-tie"
          onPress={() => navigation.navigate('OwnersList')}
        />
        <MenuCard
          title="Residents"
          subtitle="Open tenants list"
          icon="home-account"
          onPress={() => navigation.navigate('TenantsList')}
        />
      </View>
      <View style={[styles.grid, styles.secondRow]}>
        <MenuCard
          title="Search Vehicle"
          subtitle="Find flat by vehicle number"
          icon="car"
          onPress={() => navigation.navigate('VehicleSearch')}
        />
      </View>
      {canManage ? (
        <View style={[styles.grid, styles.secondRow]}>
          <MenuCard
            title="Add Owner"
            subtitle="Create owner details"
            icon="account-plus"
            onPress={() => navigation.navigate('AddOwner')}
          />
          <MenuCard
            title="Add Tenant"
            subtitle="Create tenant details"
            icon="account-plus-outline"
            onPress={() => navigation.navigate('AddTenant')}
          />
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: ui.title,
  grid: { flexDirection: 'row', gap: 12 },
  secondRow: { marginTop: 12 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.card },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  cardSub: { marginTop: 4, color: colors.muted },
});
