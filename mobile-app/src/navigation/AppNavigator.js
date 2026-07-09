import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  Surface,
  Badge,
  SettingsRow,
} from '../components/DesignSystem';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AdminRegistrationRequestsScreen from '../screens/AdminRegistrationRequestsScreen';
import PendingRequestEditScreen from '../screens/PendingRequestEditScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import NewPaymentScreen from '../screens/NewPaymentScreen';
import NewExpenseScreen from '../screens/NewExpenseScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import EditPaymentScreen from '../screens/EditPaymentScreen';
import OwnersScreen from '../screens/OwnersScreen';
import OwnerFlatsScreen from '../screens/OwnerFlatsScreen';
import OwnerDetailsScreen from '../screens/OwnerDetailsScreen';
import TenantsScreen from '../screens/TenantsScreen';
import TenantDetailsScreen from '../screens/TenantDetailsScreen';
import AddTenantScreen from '../screens/AddTenantScreen';
import DirectoryScreen from '../screens/DirectoryScreen';
import SecurityScreen from '../screens/SecurityScreen';
import HelpdeskScreen from '../screens/HelpdeskScreen';
import NoticesScreen from '../screens/NoticesScreen';
import NewNoticeScreen from '../screens/NewNoticeScreen';
import ComplaintsScreen from '../screens/ComplaintsScreen';
import NewComplaintScreen from '../screens/NewComplaintScreen';
import PaymentInfoScreen from '../screens/PaymentInfoScreen';
import VehicleSearchScreen from '../screens/VehicleSearchScreen';
import DashboardSearchScreen from '../screens/DashboardSearchScreen';
import PaymentsHubScreen from '../screens/PaymentsHubScreen';
import AddOwnerScreen from '../screens/AddOwnerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const NavigationChromeContext = createContext(null);

function useNavigationChrome() {
  return useContext(NavigationChromeContext);
}

function HeaderMenuButton({ onPress }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerIconButton}>
      <MaterialCommunityIcons name="menu" size={24} color={colors.onSurface} />
    </TouchableOpacity>
  );
}

function AccountButton() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const initial = String(user?.name || 'U').trim().charAt(0).toUpperCase() || 'U';
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={[styles.accountPill, { backgroundColor: colors.primaryContainer }]}
    >
      <Text style={[styles.accountInitial, { color: colors.onPrimaryContainer }]}>{initial}</Text>
    </TouchableOpacity>
  );
}

function SideMenu({ open, onClose }) {
  const { colors } = useAppTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const role = String(user?.role || '').toUpperCase();

  const go = (screen, params) => {
    onClose();
    navigation.navigate(screen, params);
  };

  const openOwnerDetails = async () => {
    onClose();
    if (role === 'TENANT') {
      if (!user?.block || !user?.flat) {
        Alert.alert('Info', 'No block or flat information is available.');
        return;
      }
      try {
        const p = new URLSearchParams({ block: user.block, flat: user.flat });
        const res = await apiRequest(`/api/owners?${p.toString()}`);
        const owner = (res.data || [])[0];
        if (owner?.property_id) {
          navigation.navigate('OwnerDetails', { propertyId: owner.property_id, readOnly: true });
        } else {
          Alert.alert('Not found', 'No owner found for your flat.');
        }
      } catch (e) {
        Alert.alert('Error', e?.message || 'Unable to open owner details.');
      }
      return;
    }
    navigation.navigate('OwnersList');
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.menuBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose}>
        <Surface level={2} style={styles.menuSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={{ color: colors.onPrimaryContainer, fontWeight: '900', fontSize: 20 }}>{String(user?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.menuName, { color: colors.onSurface }]} numberOfLines={1}>{user?.name || 'Resident'}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Badge label={role || 'RESIDENT'} tone="info" />
                  {user?.block ? <Badge label={`${user.block} ${user.flat}`} tone="neutral" /> : null}
                </View>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.onSurfaceVariant }]}>My Account</Text>
              <Surface level={1} style={{ padding: 0 }}>
                <SettingsRow icon="account-outline" label="Profile Settings" tone="primary" onPress={() => go('Profile')} />
                <SettingsRow icon="lock-outline" label="Security" tone="primary" isLast onPress={() => go('ChangePassword')} />
              </Surface>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.onSurfaceVariant }]}>Quick Access</Text>
              <Surface level={1} style={{ padding: 0 }}>
                <SettingsRow icon="magnify" label="Search Everything" onPress={() => go('DashboardSearch')} />
                <SettingsRow icon="qrcode-scan" label="Payment Info" onPress={() => go('PaymentInfo')} />
                <SettingsRow icon="car-search" label="Vehicle Search" onPress={() => go('VehicleSearch')} />
                <SettingsRow icon="home-city-outline" label={role === 'TENANT' ? 'View My Owner' : 'Owner Directory'} isLast onPress={openOwnerDetails} />
              </Surface>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.onSurfaceVariant }]}>Society Desk</Text>
              <Surface level={1} style={{ padding: 0 }}>
                <SettingsRow icon="bell-outline" label="Notices" onPress={() => go('Notices')} />
                <SettingsRow icon="ticket-outline" label="Complaints" onPress={() => go('Complaints')} />
                <SettingsRow icon="shield-home-outline" label="Security Desk" onPress={() => go('Security')} />
                <SettingsRow icon="headset" label="Helpdesk" isLast onPress={() => go('Helpdesk')} />
              </Surface>
            </View>

            {role === 'ADMIN' ? (
              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: colors.onSurfaceVariant }]}>Admin Center</Text>
                <Surface level={1} style={{ padding: 0 }}>
                  <SettingsRow icon="account-clock-outline" label="Requests" tone="primary" onPress={() => go('AdminRegistrationRequests')} />
                  <SettingsRow icon="cash-plus" label="Record Payment" onPress={() => go('NewPayment')} />
                  <SettingsRow icon="receipt-text-plus-outline" label="Log Expense" onPress={() => go('NewExpense')} />
                  <SettingsRow icon="account-plus-outline" label="Add Owner" onPress={() => go('AddOwner')} />
                  <SettingsRow icon="home-plus-outline" label="Add Tenant" isLast onPress={() => go('AddTenant')} />
                </Surface>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.errorContainer }]}
              onPress={async () => {
                onClose();
                await logout();
              }}
            >
              <MaterialCommunityIcons name="logout" size={20} color={colors.onErrorContainer} />
              <Text style={[styles.logoutText, { color: colors.onErrorContainer }]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Surface>
      </Pressable>
    </Modal>
  );
}

function NavigationChromeProvider({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const value = useMemo(() => ({ openMenu: () => setMenuOpen(true), closeMenu: () => setMenuOpen(false) }), []);

  return (
    <NavigationChromeContext.Provider value={value}>
      {children}
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </NavigationChromeContext.Provider>
  );
}

function roleTabs(role) {
  const base = [
    { name: 'Dashboard', component: DashboardScreen, icon: 'view-dashboard', iconOff: 'view-dashboard-outline', label: 'Home' },
    { name: 'Payments', component: PaymentsHubScreen, icon: 'cash-multiple', iconOff: 'cash-outline', label: 'Payments' },
    { name: 'Community', component: NoticesScreen, icon: 'bell', iconOff: 'bell-outline', label: 'Updates' },
    { name: 'Support', component: HelpdeskScreen, icon: 'lifebuoy', iconOff: 'lifebuoy', label: 'Help' },
  ];

  if (role === 'ADMIN') {
    return [
      base[0],
      base[1],
      { name: 'Residents', component: OwnersScreen, icon: 'account-group', iconOff: 'account-group-outline', label: 'People' },
      base[2],
      base[3],
    ];
  }

  if (role === 'OWNER') {
    return [
      base[0],
      base[1],
      { name: 'My Flats', component: OwnerFlatsScreen, icon: 'home-city', iconOff: 'home-city-outline', label: 'My Flats' },
      base[2],
      base[3],
    ];
  }

  return base;
}

function MainTabs() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const role = String(user?.role || '').toUpperCase();
  const tabs = useMemo(() => roleTabs(role), [role]);
  const chrome = useNavigationChrome();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = tabs.find((item) => item.name === route.name);
        return {
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && { backgroundColor: colors.secondaryContainer }]}>
              <MaterialCommunityIcons
                name={focused ? tab?.icon : tab?.iconOff}
                size={24}
                color={focused ? colors.onSecondaryContainer : colors.onSurfaceVariant}
              />
            </View>
          ),
          tabBarActiveTintColor: colors.onSurface,
          tabBarInactiveTintColor: colors.onSurfaceVariant,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colors.surfaceContainer, borderTopWidth: 0 },
          ],
          headerTitleStyle: { ...typography.titleLarge, color: colors.onSurface, fontWeight: '700' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => <HeaderMenuButton onPress={chrome.openMenu} />,
          headerRight: () => <AccountButton />,
        };
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={{ title: tab.label }} />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading, user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const { colors } = useAppTheme();

  if (loading) return null;

  return (
    <NavigationChromeProvider>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { ...typography.titleLarge, color: colors.onSurface, fontWeight: '700' },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.onSurface,
          headerRight: () => <AccountButton />,
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
            {canManage ? <Stack.Screen name="AdminRegistrationRequests" component={AdminRegistrationRequestsScreen} options={{ title: 'Requests' }} /> : null}
            {canManage ? <Stack.Screen name="PendingRequestEdit" component={PendingRequestEditScreen} options={{ title: 'Edit' }} /> : null}

            <Stack.Screen name="PaymentsList" component={PaymentsScreen} options={{ title: 'Payments' }} />
            <Stack.Screen name="ExpensesList" component={ExpensesScreen} options={{ title: 'Expenses' }} />
            <Stack.Screen name="OwnersList" component={OwnersScreen} options={{ title: 'Owners' }} />
            <Stack.Screen name="TenantsList" component={TenantsScreen} options={{ title: 'Tenants' }} />
            <Stack.Screen name="PaymentsHub" component={PaymentsHubScreen} options={{ title: 'Ledger' }} />
            <Stack.Screen name="Notices" component={NoticesScreen} options={{ title: 'Updates' }} />
            <Stack.Screen name="NewNotice" component={NewNoticeScreen} options={{ title: 'New Update' }} />
            <Stack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Complaints' }} />
            <Stack.Screen name="NewComplaint" component={NewComplaintScreen} options={{ title: 'New Complaint' }} />
            <Stack.Screen name="PaymentInfo" component={PaymentInfoScreen} options={{ title: 'Payment Details' }} />
            <Stack.Screen name="VehicleSearch" component={VehicleSearchScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DashboardSearch" component={DashboardSearchScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Directory' }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
            <Stack.Screen name="Helpdesk" component={HelpdeskScreen} options={{ title: 'Support' }} />

            {canManage ? <Stack.Screen name="AddOwner" component={AddOwnerScreen} options={{ title: 'Add Owner' }} /> : null}
            {canManage ? <Stack.Screen name="AddTenant" component={AddTenantScreen} options={{ title: 'Add Tenant' }} /> : null}
            {canManage ? <Stack.Screen name="NewPayment" component={NewPaymentScreen} options={{ title: 'Record Payment' }} /> : null}
            {canManage ? <Stack.Screen name="NewExpense" component={NewExpenseScreen} options={{ title: 'Log Expense' }} /> : null}
            <Stack.Screen name="EditExpense" component={EditExpenseScreen} options={{ title: 'Edit Expense' }} />
            <Stack.Screen name="EditPayment" component={EditPaymentScreen} options={{ title: 'Edit Payment' }} />
            <Stack.Screen name="OwnerDetails" component={OwnerDetailsScreen} options={{ title: 'Details' }} />
            <Stack.Screen name="MyFlats" component={OwnerFlatsScreen} options={{ title: 'My Flats' }} />
            <Stack.Screen name="TenantDetails" component={TenantDetailsScreen} options={{ title: 'Details' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Join Community' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationChromeProvider>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    marginLeft: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPill: {
    marginRight: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 16,
    paddingTop: 60,
  },
  menuSheet: {
    borderRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuName: {
    ...typography.titleLarge,
    fontWeight: '700',
  },
  menuSection: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    ...typography.labelSmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  logoutButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 100,
    paddingVertical: 16,
    marginBottom: 24,
  },
  logoutText: {
    ...typography.labelLarge,
    fontWeight: '700',
  },
  tabBar: {
    height: 80,
    paddingBottom: 16,
    paddingTop: 12,
  },
  tabIconContainer: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    ...typography.labelMedium,
    fontWeight: '700',
  },
});
