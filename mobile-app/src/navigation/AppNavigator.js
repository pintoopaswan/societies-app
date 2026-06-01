import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
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
import { apiRequest } from '../lib/api';
import { colors, radius, shadow } from '../lib/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AvatarMenu() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const initial = String(user?.name || 'U').trim().charAt(0).toUpperCase();

  const closeMenu = () => setOpen(false);
  const handleNavigate = (screen) => {
    closeMenu();
    navigation.navigate(screen);
  };

  const handleOwnerPress = async () => {
    closeMenu();
    if (String(user?.role || '').toUpperCase() === 'TENANT') {
      if (!user?.block || !user?.flat) return Alert.alert('Info', 'No block/flat information available.');
      try {
        const p = new URLSearchParams({ block: user.block, flat: user.flat });
        const res = await apiRequest(`/api/owners?${p.toString()}`);
        const owner = (res.data || [])[0];
        if (owner?.property_id) {
          navigation.navigate('OwnerDetails', { propertyId: owner.property_id, readOnly: true });
        } else {
          Alert.alert('Not found', 'No owner found for your flat');
        }
      } catch (e) {
        Alert.alert('Error', e?.message || 'Unable to load owner');
      }
    } else {
      navigation.navigate('OwnersList');
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={{ marginRight: 8 }}>
        <View style={styles.navAvatar}>
          <Text style={styles.navAvatarText}>{initial || 'U'}</Text>
        </View>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <View style={styles.menuPopup}>
            <Text style={styles.menuTitle}>{user?.name || 'User'}</Text>
            <Text style={styles.menuSubtitle}>{`${user?.role || ''} | ${user?.block || '-'} ${user?.flat || ''}`.trim()}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Profile')}>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('ChangePassword')}>
              <Text style={styles.menuItemText}>Change Password</Text>
            </TouchableOpacity>
            {String(user?.role || '').toUpperCase() !== 'OWNER' ? (
              <TouchableOpacity style={styles.menuItem} onPress={handleOwnerPress}>
                <Text style={styles.menuItemText}>Owner</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); logout(); }}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const iconForRoute = (name, focused) => {
    const color = focused ? '#20343a' : '#9aa2a5';
    const size = 25;
    const map = {
      Dashboard: 'view-dashboard-outline',
      Payments: 'cash-multiple',
      Expenses: 'cash-minus',
      Notices: 'bell-outline',
      Complaints: 'ticket-outline',
      Owners: 'account-tie',
      Owner: 'account-tie',
      Tenants: 'home-account',
      Security: 'security',
      Helpdesk: 'account-wrench',
      Directory: 'card-account-details-outline',
      Reports: 'file-chart-outline',
    };
    return <MaterialCommunityIcons name={map[name] || 'circle-outline'} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => iconForRoute(route.name, focused),
        tabBarActiveTintColor: '#20343a',
        tabBarInactiveTintColor: '#9aa2a5',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerStyle: styles.stackHeader,
        headerRight: () => <AvatarMenu />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Payments" component={PaymentsHubScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Notices" component={NoticesScreen} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} />
      {role === 'OWNER' ? <Tab.Screen name="Tenants" component={TenantsScreen} /> : null}
      {role === 'TENANT' ? <Tab.Screen name="Owner" component={TenantOwnerRedirectScreen} /> : null}
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
        Alert.alert('Info', 'No block/flat information available.');
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
      <Text style={styles.reportText}>Opening owner details...</Text>
    </View>
  );
}

function ReportsPlaceholderScreen() {
  const navigation = useNavigation();
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Dashboard');
    }
  };

  return (
    <View style={styles.reportScreen}>
      <View style={styles.reportHeaderRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#172b31" />
        </TouchableOpacity>
        <Text style={styles.reportTitle}>Payment Report</Text>
      </View>
      <Text style={styles.reportText}>Payment Report functionality will be added in next update.</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { token, loading, user } = useAuth();
  const canManage = user?.role === 'ADMIN';

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerRight: () => <AvatarMenu /> }}>
      {token ? (
        <>
          <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
          {canManage ? <Stack.Screen name="AdminRegistrationRequests" component={AdminRegistrationRequestsScreen} options={{ title: 'Admin Requests' }} /> : null}
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
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Forgot Password' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  navAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navAvatarText: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 0,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 10,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stackHeader: {
    backgroundColor: colors.appBg,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  menuPopup: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  menuSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    color: colors.text,
    fontWeight: '700',
  },
  menuItemDanger: {
    color: '#d32f2f',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  reportScreen: {
    flex: 1,
    backgroundColor: colors.appBg,
    padding: 16,
  },
  redirectScreen: {
    flex: 1,
    backgroundColor: colors.appBg,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 8,
    marginRight: 10,
  },
  reportTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  reportText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
