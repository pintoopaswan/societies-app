import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';

function MenuCard({ title, subtitle, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={30} color="#163c66" />
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
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  secondRow: { marginTop: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dbe5ee', padding: 14 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef5fc',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1c415f' },
  cardSub: { marginTop: 4, color: '#5f7690' },
});
