import React, { useCallback, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';

function Tile({ title, icon, color, onPress, badgeCount = 0 }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <View style={styles.iconWrap}>
        {badgeCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text></View> : null}
        <MaterialCommunityIcons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.tileTxt}>{title}</Text>
    </TouchableOpacity>
  );
}

function OwnerTile({ owner, onPress }) {
  const name = owner?.owner_name || 'No Active Owner';
  const initial = String(name || 'O').trim().charAt(0).toUpperCase() || 'O';
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} disabled={!owner?.property_id}>
      <View style={styles.iconWrap}>
        {owner?.owner_photo_url ? (
          <Image source={{ uri: owner.owner_photo_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{initial}</Text>
        )}
      </View>
      <Text style={styles.tileTxt}>{name}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

function DashboardHeader({ user, navigation, selectedFlat, flatOptions, onOpenFlatPicker }) {
  const role = String(user?.role || 'Resident').toUpperCase();
  const title = selectedFlat?.block && selectedFlat?.flat ? `${selectedFlat.block} ${selectedFlat.flat}` : 'Society';
  const canSelectFlat = flatOptions.length > 1;

  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <TouchableOpacity style={styles.titleRow} onPress={onOpenFlatPicker} disabled={!canSelectFlat}>
          <Text style={styles.homeTitle} numberOfLines={1}>{title}</Text>
          {canSelectFlat ? <MaterialCommunityIcons name="chevron-down" size={20} color={colors.primary} /> : null}
        </TouchableOpacity>
        <Text style={styles.homeSubtitle}>{role === 'ADMIN' ? 'Admin Console' : 'Resident App'}</Text>
      </View>
      <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('DashboardSearch')}>
        <MaterialCommunityIcons name="magnify" size={24} color={colors.primary} />
      </TouchableOpacity>
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
  const [flatOptions, setFlatOptions] = useState([]);
  const [selectedFlat, setSelectedFlat] = useState(user?.block && user?.flat ? { block: user.block, flat: user.flat } : null);
  const [flatPickerOpen, setFlatPickerOpen] = useState(false);

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

  const loadFlatOptions = useCallback(async () => {
    const fallback = user?.block && user?.flat ? [{ block: user.block, flat: user.flat }] : [];
    if (isOwner && user?.mobile) {
      try {
        const res = await apiRequest(`/api/owner-flats?owner_contact=${encodeURIComponent(user.mobile)}`);
        const rows = (res.data || []).map((item) => ({ block: item.block, flat: item.flat }));
        const next = rows.length > 0 ? rows : fallback;
        setFlatOptions(next);
        setSelectedFlat((prev) => next.find((item) => item.block === prev?.block && item.flat === prev?.flat) || next[0] || null);
        return;
      } catch {
        setFlatOptions(fallback);
        setSelectedFlat(fallback[0] || null);
        return;
      }
    }
    setFlatOptions(fallback);
    setSelectedFlat(fallback[0] || null);
  }, [isOwner, user?.block, user?.flat, user?.mobile]);

  useFocusEffect(useCallback(() => {
    loadPendingCount();
    loadActiveOwner();
    loadFlatOptions();
  }, [loadPendingCount, loadActiveOwner, loadFlatOptions]));

  return (
    <Page>
      <DashboardHeader
        user={user}
        navigation={navigation}
        selectedFlat={selectedFlat}
        flatOptions={flatOptions}
        onOpenFlatPicker={() => setFlatPickerOpen(true)}
      />

      {isAdmin ? (
        <>
        <Section title="Admin Operations">
          <Tile title="Pending Requests" icon="account-clock-outline" color="#1d4ed8" badgeCount={pendingCount} onPress={() => navigation.navigate('AdminRegistrationRequests')} />
          <Tile title="Notices" icon="bell-outline" color="#2563eb" onPress={() => navigation.navigate('Notices')} />
          <Tile title="Complaints" icon="ticket-outline" color="#0ea5e9" onPress={() => navigation.navigate('Complaints')} />
        </Section>
        <Section title="Payments">
          <Tile title="Payments" icon="cash-multiple" color="#20343a" onPress={() => navigation.navigate('PaymentsList')} />
          <Tile title="Expenses" icon="cash-minus" color="#2f855a" onPress={() => navigation.navigate('Expenses')} />
          <Tile title="Add Payment" icon="cash-plus" color="#8a5cf6" onPress={() => navigation.navigate('NewPayment')} />
          <Tile title="Add Expense" icon="receipt" color="#d97706" onPress={() => navigation.navigate('NewExpense')} />
        </Section>
        <Section title="Directory">
          <Tile title="View Owners" icon="account-tie" color="#a855f7" onPress={() => navigation.navigate('OwnersList')} />
          <Tile title="View Tenants" icon="home-account" color="#0ea5e9" onPress={() => navigation.navigate('TenantsList')} />
          <Tile title="Search Vehicle" icon="car" color="#20343a" onPress={() => navigation.navigate('VehicleSearch')} />
          <Tile title="Add Owner" icon="account-plus" color="#ec4899" onPress={() => navigation.navigate('AddOwner')} />
          <Tile title="Add Tenant" icon="account-plus-outline" color="#14b8a6" onPress={() => navigation.navigate('AddTenant')} />
        </Section>
        <Section title="Emergency Help">
          <Tile title="Security" icon="shield-home" color="#dc2626" onPress={() => navigation.navigate('Security')} />
          <Tile title="Helpdesk" icon="headset" color="#ea580c" onPress={() => navigation.navigate('Helpdesk')} />
        </Section>
        </>
      ) : null}

      {isOwner ? (
        <>
        <Section title="My Flats">
          <Tile title="My Flats" icon="home-city" color="#7c3aed" onPress={() => navigation.navigate('MyFlats')} />
          <Tile title="Tenant List" icon="home-group" color="#7c3aed" onPress={() => navigation.navigate('Tenants', { ownerScoped: true })} />
        </Section>
        <Section title="Payments">
          <Tile title="Payment History" icon="cash-multiple" color="#20343a" onPress={() => navigation.navigate('PaymentsList')} />
          <Tile title="Expenses" icon="cash-minus" color="#2f855a" onPress={() => navigation.navigate('Expenses')} />
        </Section>
        <Section title="Community">
          <Tile title="Notices" icon="bell-outline" color="#2563eb" onPress={() => navigation.navigate('Notices')} />
          <Tile title="Complaints" icon="ticket-outline" color="#0ea5e9" onPress={() => navigation.navigate('Complaints')} />
        </Section>
        <Section title="Directory">
          <Tile title="Search Vehicle" icon="car" color="#20343a" onPress={() => navigation.navigate('VehicleSearch')} />
        </Section>
        <Section title="Emergency Help">
          <Tile title="Security" icon="shield-home" color="#dc2626" onPress={() => navigation.navigate('Security')} />
          <Tile title="Helpdesk" icon="headset" color="#ea580c" onPress={() => navigation.navigate('Helpdesk')} />
        </Section>
        </>
      ) : null}

      {isTenant ? (
        <>
        <Section title="My Home">
          <OwnerTile
            owner={activeOwner}
            onPress={() => activeOwner?.property_id && navigation.navigate('OwnerDetails', { propertyId: activeOwner.property_id, readOnly: true })}
          />
        </Section>
        <Section title="Payments">
          <Tile title="Payment History" icon="cash-multiple" color="#20343a" onPress={() => navigation.navigate('PaymentsList')} />
        </Section>
        <Section title="Community">
          <Tile title="Notices" icon="bell-outline" color="#2563eb" onPress={() => navigation.navigate('Notices')} />
          <Tile title="Complaints" icon="ticket-outline" color="#0ea5e9" onPress={() => navigation.navigate('Complaints')} />
        </Section>
        <Section title="Directory">
          <Tile title="Search Vehicle" icon="car" color="#20343a" onPress={() => navigation.navigate('VehicleSearch')} />
        </Section>
        <Section title="Emergency Help">
          <Tile title="Security" icon="shield-home" color="#dc2626" onPress={() => navigation.navigate('Security')} />
          <Tile title="Helpdesk" icon="headset" color="#ea580c" onPress={() => navigation.navigate('Helpdesk')} />
        </Section>
        </>
      ) : null}

      {!isAdmin && !isOwner && !isTenant ? (
        <Section title="Directory">
          <Tile title="Search Vehicle" icon="car" color="#20343a" onPress={() => navigation.navigate('VehicleSearch')} />
        </Section>
      ) : null}

      <Modal visible={flatPickerOpen} transparent animationType="fade" onRequestClose={() => setFlatPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFlatPickerOpen(false)}>
          <View style={styles.flatPicker}>
            <Text style={styles.flatPickerTitle}>Select Flat</Text>
            {flatOptions.map((item) => (
              <TouchableOpacity
                key={`${item.block}-${item.flat}`}
                style={styles.flatOption}
                onPress={() => {
                  setSelectedFlat(item);
                  setFlatPickerOpen(false);
                }}
              >
                <Text style={styles.flatOptionText}>{item.block} {item.flat}</Text>
                {selectedFlat?.block === item.block && selectedFlat?.flat === item.flat ? (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.updatesPanel}>
        <View style={styles.grabber} />
        <Text style={styles.updatesTitle}>You have no new updates</Text>
        <View style={styles.updateCard}>
          <View style={styles.updateHeader}>
            <Text style={styles.updateCardTitle}>Today's Entry Updates</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Security')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.updateBody}>
            <View style={styles.updateIconCircle}>
              <MaterialCommunityIcons name="account-hard-hat-outline" size={34} color={colors.primary} />
            </View>
            <View style={styles.updateDivider} />
            <Text style={styles.updateText}>You don't have any upcoming visitors.</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerCopy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  homeTitle: { color: colors.text, fontSize: 22, fontWeight: '800', maxWidth: '86%' },
  homeSubtitle: { color: colors.muted, fontSize: 15, marginTop: 2 },
  headerIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.22)', justifyContent: 'flex-start', padding: 16, paddingTop: 90 },
  flatPicker: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, ...shadow.card },
  flatPickerTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  flatOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  flatOptionText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  tile: { width: '25%', alignItems: 'center', paddingHorizontal: 4 },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...shadow.card,
  },
  tileTxt: { color: colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center', minHeight: 34 },
  badge: { position: 'absolute', right: -7, top: -8, backgroundColor: colors.danger, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, zIndex: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  avatarImage: { width: 66, height: 66, borderRadius: 20 },
  avatarInitial: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  updatesPanel: { backgroundColor: colors.surfaceSoft, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -16, marginTop: 8, padding: 16, paddingTop: 12 },
  grabber: { width: 58, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 18 },
  updatesTitle: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 18 },
  updateCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  updateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  updateCardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  viewAll: { color: colors.primaryBlue, fontSize: 16, fontWeight: '800' },
  updateBody: { flexDirection: 'row', alignItems: 'center', minHeight: 96 },
  updateIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  updateDivider: { width: 1, height: 76, backgroundColor: colors.border, marginHorizontal: 18 },
  updateText: { flex: 1, color: colors.muted, fontSize: 16, lineHeight: 22 },
});
