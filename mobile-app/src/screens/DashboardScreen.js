import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';

function Tile({ title, icon, color, onPress, badgeCount = 0 }) {
  return (
    <TouchableOpacity style={[styles.tile, { borderColor: color }]} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        {badgeCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text></View> : null}
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.tileTxt}>{title}</Text>
    </TouchableOpacity>
  );
}

function OwnerTile({ owner, onPress }) {
  const name = owner?.owner_name || 'No Active Owner';
  const initial = String(name || 'O').trim().charAt(0).toUpperCase() || 'O';
  return (
    <TouchableOpacity style={[styles.tile, { borderColor: '#0f766e' }]} onPress={onPress} disabled={!owner?.property_id}>
      <View style={[styles.iconWrap, { backgroundColor: '#ccfbf1' }]}>
        {owner?.owner_photo_url ? (
          <Image source={{ uri: owner.owner_photo_url }} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarInitial, { color: '#0f766e' }]}>{initial}</Text>
        )}
      </View>
      <Text style={styles.tileTxt}>{name}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, color, children }) {
  return (
    <View style={[styles.section, { backgroundColor: `${color}14`, borderColor: `${color}44` }]}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, getRegistrationRequests } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isOwner = role === 'OWNER';
  const isTenant = role === 'TENANT';
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOwner, setActiveOwner] = useState(null);

  const loadPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const rows = await getRegistrationRequests();
      setPendingCount((rows || []).filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length);
    } catch {
      setPendingCount(0);
    }
  }, [isAdmin, getRegistrationRequests]);

  const loadActiveOwner = useCallback(async () => {
    if (!isTenant || !user?.block || !user?.flat) return;
    try {
      const p = new URLSearchParams({ block: user.block, flat: user.flat });
      const res = await apiRequest(`/api/owners?${p.toString()}`);
      setActiveOwner((res.data || [])[0] || null);
    } catch {
      setActiveOwner(null);
    }
  }, [isTenant, user?.block, user?.flat]);

  useFocusEffect(useCallback(() => {
    loadPendingCount();
    loadActiveOwner();
  }, [loadPendingCount, loadActiveOwner]));

  return (
    <Page>
      <Text style={styles.heading}>Dashboard</Text>

      {isOwner ? (
        <Section title="My Flats" color="#7c3aed">
          <Tile title="My Flats" icon="home-city" color="#7c3aed" onPress={() => navigation.navigate('MyFlats')} />
          <Tile title="Tenant List" icon="home-group" color="#7c3aed" onPress={() => navigation.navigate('Tenants', { ownerScoped: true })} />
        </Section>
      ) : null}

      <Section title="Payments" color="#1f6fb2">
        <Tile title={isAdmin ? 'View Payments' : 'Payment History'} icon="cash-multiple" color="#1f6fb2" onPress={() => navigation.navigate('PaymentsList')} />
        <Tile title="View Expenses" icon="cash-minus" color="#2f855a" onPress={() => navigation.navigate('Expenses')} />
        {isAdmin ? <Tile title="Add Payment" icon="cash-plus" color="#8a5cf6" onPress={() => navigation.navigate('NewPayment')} /> : null}
        {isAdmin ? <Tile title="Add Expense" icon="receipt" color="#d97706" onPress={() => navigation.navigate('NewExpense')} /> : null}
      </Section>

      {isAdmin ? (
        <Section title="Directory" color="#a855f7">
          <Tile title="View Owners" icon="account-tie" color="#a855f7" onPress={() => navigation.navigate('OwnersList')} />
          <Tile title="View Tenants" icon="home-account" color="#0ea5e9" onPress={() => navigation.navigate('TenantsList')} />
          <Tile title="Add Owner" icon="account-plus" color="#ec4899" onPress={() => navigation.navigate('AddOwner')} />
          <Tile title="Add Tenant" icon="account-plus-outline" color="#14b8a6" onPress={() => navigation.navigate('AddTenant')} />
        </Section>
      ) : null}

      {isTenant ? (
        <Section title="Owner" color="#0f766e">
          <OwnerTile
            owner={activeOwner}
            onPress={() => activeOwner?.property_id && navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })}
          />
        </Section>
      ) : null}

      {isAdmin ? (
        <Section title="Pending Requests" color="#0369a1">
          <Tile title="Pending Requests" icon="account-clock-outline" color="#0369a1" badgeCount={pendingCount} onPress={() => navigation.navigate('AdminRegistrationRequests')} />
        </Section>
      ) : null}

      {isAdmin ? (
        <Section title="Reports" color="#7c3aed">
          <Tile title="Payment Report" icon="file-chart-outline" color="#7c3aed" onPress={() => navigation.navigate('Reports')} />
        </Section>
      ) : null}

      <Section title="Emergency Help" color="#dc2626">
        <Tile title="Security" icon="shield-home" color="#dc2626" onPress={() => navigation.navigate('Security')} />
        <Tile title="Helpdesk" icon="headset" color="#ea580c" onPress={() => navigation.navigate('Helpdesk')} />
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 30, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  section: { borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: { width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, padding: 10, alignItems: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileTxt: { color: '#163a5c', fontWeight: '700', textAlign: 'center' },
  badge: { position: 'absolute', right: -6, top: -8, backgroundColor: '#dc2626', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  avatarImage: { width: 48, height: 48, borderRadius: 12 },
  avatarInitial: { color: '#7c3aed', fontSize: 22, fontWeight: '800' },
});
