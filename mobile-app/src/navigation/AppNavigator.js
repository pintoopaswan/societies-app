import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import {
  Surface,
  Badge,
  SettingsRow,
  ActivityRow,
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
    <TouchableOpacity onPress={onPress} style={styles.headerIconButton} accessibilityRole="button" accessibilityLabel="Open menu">
      <MaterialCommunityIcons name="menu" size={24} color={colors.text} />
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
      style={[styles.accountPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Text style={[styles.accountInitial, { color: colors.text }]}>{initial}</Text>
    </TouchableOpacity>
  );
}

function SideMenu({ open, onClose }) {
  const { colors, shadow } = useAppTheme();
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
      <Pressable style={[styles.menuBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Surface tone="elevated" style={[styles.menuSheet, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>{String(user?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.menuName, { color: colors.text }]} numberOfLines={1}>{user?.name || 'Resident'}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Badge label={role || 'RESIDENT'} tone="info" />
                  {user?.block ? <Badge label={`${user.block} ${user.flat}`} tone="neutral" /> : null}
                </View>
              </View>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.muted }]}>My Account</Text>
              <Surface style={{ padding: 0 }}>
                <SettingsRow icon="account-outline" label="Profile Settings" tone="blue" onPress={() => go('Profile')} />
                <SettingsRow icon="lock-outline" label="Security" tone="amber" isLast onPress={() => go('ChangePassword')} />
              </Surface>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.muted }]}>Quick Access</Text>
              <Surface style={{ padding: 0 }}>
                <SettingsRow icon="magnify" label="Search Everything" tone="default" onPress={() => go('DashboardSearch')} />
                <SettingsRow icon="qrcode-scan" label="Payment Info" tone="success" onPress={() => go('PaymentInfo')} />
                <SettingsRow icon="car-search" label="Vehicle Search" tone="indigo" onPress={() => go('VehicleSearch')} />
                <SettingsRow icon="home-city-outline" label={role === 'TENANT' ? 'View My Owner' : 'Owner Directory'} tone="blue" isLast onPress={openOwnerDetails} />
              </Surface>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.menuSectionTitle, { color: colors.muted }]}>Society Desk</Text>
              <Surface style={{ padding: 0 }}>
                <SettingsRow icon="bell-outline" label="Notices" tone="warning" onPress={() => go('Notices')} />
                <SettingsRow icon="ticket-outline" label="Complaints" tone="red" onPress={() => go('Complaints')} />
                <SettingsRow icon="shield-home-outline" label="Security Desk" tone="default" onPress={() => go('Security')} />
                <SettingsRow icon="headset" label="Helpdesk" tone="blue" isLast onPress={() => go('Helpdesk')} />
              </Surface>
            </View>

            {role === 'ADMIN' ? (
              <View style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: colors.muted }]}>Admin Center</Text>
                <Surface style={{ padding: 0 }}>
                  <SettingsRow icon="account-clock-outline" label="Requests" tone="red" onPress={() => go('AdminRegistrationRequests')} />
                  <SettingsRow icon="cash-plus" label="Record Payment" tone="success" onPress={() => go('NewPayment')} />
                  <SettingsRow icon="receipt-text-plus-outline" label="Log Expense" tone="warning" onPress={() => go('NewExpense')} />
                  <SettingsRow icon="account-plus-outline" label="Add Owner" tone="blue" onPress={() => go('AddOwner')} />
                  <SettingsRow icon="home-plus-outline" label="Add Tenant" tone="indigo" isLast onPress={() => go('AddTenant')} />
                </Surface>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}
              onPress={async () => {
                onClose();
                await logout();
              }}
            >
              <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
              <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
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
  if (role === 'ADMIN') {
    return [
      { name: 'Dashboard', component: DashboardScreen, icon: 'view-dashboard-outline', label: 'Home' },
      { name: 'Payments', component: PaymentsHubScreen, icon: 'cash-multiple', label: 'Payments' },
      { name: 'Residents', component: OwnersScreen, icon: 'account-group-outline', label: 'Residents' },
      { name: 'Community', component: NoticesScreen, icon: 'bell-outline', label: 'Community' },
      { name: 'Support', component: HelpdeskScreen, icon: 'lifebuoy', label: 'Support' },
    ];
  }

  if (role === 'OWNER') {
    return [
      { name: 'Dashboard', component: DashboardScreen, icon: 'view-dashboard-outline', label: 'Home' },
      { name: 'Payments', component: PaymentsHubScreen, icon: 'cash-multiple', label: 'Payments' },
      { name: 'My Flats', component: OwnerFlatsScreen, icon: 'home-city-outline', label: 'My Flats' },
      { name: 'Community', component: NoticesScreen, icon: 'bell-outline', label: 'Community' },
      { name: 'Support', component: HelpdeskScreen, icon: 'lifebuoy', label: 'Support' },
    ];
  }

  return [
    { name: 'Dashboard', component: DashboardScreen, icon: 'view-dashboard-outline', label: 'Home' },
    { name: 'Payments', component: PaymentsHubScreen, icon: 'cash-multiple', label: 'Payments' },
    { name: 'Notices', component: NoticesScreen, icon: 'bell-outline', label: 'Notices' },
    { name: 'Support', component: HelpdeskScreen, icon: 'lifebuoy', label: 'Support' },
  ];
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
            <MaterialCommunityIcons
              name={tab?.icon || 'circle-outline'}
              size={24}
              color={focused ? colors.primaryBlue : colors.muted}
            />
          ),
          tabBarActiveTintColor: colors.primaryBlue,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ],
          tabBarItemStyle: styles.tabItem,
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '800' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
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

function TenantOwnerRedirectScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  useFocusEffect(useCallback(() => {
    let active = true;
    const openOwner = async () => {
      if (!user?.block || !user?.flat) {
        Alert.alert('Info', 'No block or flat information available.');
        return;
      }
      try {
        const p = new URLSearchParams({ block: user.block, flat: user.flat });
        const res = await apiRequest(`/api/owners?${p.toString()}`);
        const owner = (res.data || [])[0];
        if (active && owner?.property_id) {
          navigation.navigate('OwnerDetails', { propertyId: owner.property_id, readOnly: true });
        } else if (active) {
          Alert.alert('Not found', 'No owner found for your flat');
        }
      } catch (e) {
        if (active) Alert.alert('Error', e?.message || 'Unable to load owner');
      }
    };
    openOwner();
    return () => { active = false; };
  }, [navigation, user?.block, user?.flat]));

  return (
    <View style={styles.redirectScreen}>
      <Text style={styles.redirectText}>Opening owner details...</Text>
    </View>
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
          headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: '800' },
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerRight: () => <AccountButton />,
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
            {canManage ? <Stack.Screen name="AdminRegistrationRequests" component={AdminRegistrationRequestsScreen} options={{ title: 'Registration Requests' }} /> : null}
            {canManage ? <Stack.Screen name="PendingRequestEdit" component={PendingRequestEditScreen} options={{ title: 'Edit Request' }} /> : null}

            <Stack.Screen name="PaymentsList" component={PaymentsScreen} options={{ title: 'Payments' }} />
            <Stack.Screen name="ExpensesList" component={ExpensesScreen} options={{ title: 'Expenses' }} />
            <Stack.Screen name="OwnersList" component={OwnersScreen} options={{ title: 'Owners' }} />
            <Stack.Screen name="TenantsList" component={TenantsScreen} options={{ title: 'Tenants' }} />
            <Stack.Screen name="PaymentsHub" component={PaymentsHubScreen} options={{ title: 'Payments' }} />
            <Stack.Screen name="Notices" component={NoticesScreen} options={{ title: 'Notices' }} />
            <Stack.Screen name="NewNotice" component={NewNoticeScreen} options={{ title: 'New Notice' }} />
            <Stack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Complaints' }} />
            <Stack.Screen name="NewComplaint" component={NewComplaintScreen} options={{ title: 'New Complaint' }} />
            <Stack.Screen name="PaymentInfo" component={PaymentInfoScreen} options={{ title: 'Payment Info' }} />
            <Stack.Screen name="VehicleSearch" component={VehicleSearchScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DashboardSearch" component={DashboardSearchScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Directory' }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
            <Stack.Screen name="Helpdesk" component={HelpdeskScreen} options={{ title: 'Helpdesk' }} />

            {canManage ? <Stack.Screen name="AddOwner" component={AddOwnerScreen} options={{ title: 'Add Owner' }} /> : null}
            {canManage ? <Stack.Screen name="AddTenant" component={AddTenantScreen} options={{ title: 'Add Tenant' }} /> : null}
            {canManage ? <Stack.Screen name="NewPayment" component={NewPaymentScreen} options={{ title: 'New Payment' }} /> : null}
            {canManage ? <Stack.Screen name="NewExpense" component={NewExpenseScreen} options={{ title: 'New Expense' }} /> : null}
            <Stack.Screen name="EditExpense" component={EditExpenseScreen} options={{ title: 'Edit Expense' }} />
            <Stack.Screen name="EditPayment" component={EditPaymentScreen} options={{ title: 'Edit Payment' }} />
            <Stack.Screen name="OwnerDetails" component={OwnerDetailsScreen} options={{ title: 'Owner Details' }} />
            <Stack.Screen name="MyFlats" component={OwnerFlatsScreen} options={{ title: 'My Flats' }} />
            <Stack.Screen name="TenantDetails" component={TenantDetailsScreen} options={{ title: 'Tenant Details' }} />
            <Stack.Screen name="TenantOwnerRedirect" component={TenantOwnerRedirectScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationChromeProvider>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    marginLeft: 12,
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPill: {
    marginRight: 12,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitial: {
    fontSize: 15,
    fontWeight: '900',
  },
  menuBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 14,
    paddingTop: 54,
  },
  menuSheet: {
    borderRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  menuAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  menuSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  logoutButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tabBar: {
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  redirectScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redirectText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
