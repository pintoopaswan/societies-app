import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/lib/auth';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import AdminRegistrationRequestsScreen from './src/screens/AdminRegistrationRequestsScreen';
import PendingRequestEditScreen from './src/screens/PendingRequestEditScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import NewPaymentScreen from './src/screens/NewPaymentScreen';
import NewExpenseScreen from './src/screens/NewExpenseScreen';
import EditExpenseScreen from './src/screens/EditExpenseScreen';
import EditPaymentScreen from './src/screens/EditPaymentScreen';
import OwnersScreen from './src/screens/OwnersScreen';
import OwnerDetailsScreen from './src/screens/OwnerDetailsScreen';
import TenantsScreen from './src/screens/TenantsScreen';
import TenantDetailsScreen from './src/screens/TenantDetailsScreen';
import AddTenantScreen from './src/screens/AddTenantScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import HelpdeskScreen from './src/screens/HelpdeskScreen';
import PaymentsHubScreen from './src/screens/PaymentsHubScreen';
import AddOwnerScreen from './src/screens/AddOwnerScreen';

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

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={{ marginRight: 8 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f6fb2', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{initial || 'U'}</Text>
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
    const color = focused ? '#0f4c81' : '#7f93a8';
    const size = 22;
    const map = {
      Dashboard: 'view-dashboard-outline',
      Payments: 'cash-multiple',
      Expenses: 'cash-minus',
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
        headerRight: () => <AvatarMenu />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Payments" component={PaymentsHubScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      {role === 'ADMIN' ? <Tab.Screen name="Directory" component={DirectoryScreen} /> : null}
      {role === 'ADMIN' ? <Tab.Screen name="Reports" component={ReportsPlaceholderScreen} /> : null}
      {role === 'OWNER' ? <Tab.Screen name="Tenants" component={TenantsScreen} /> : null}
      {role === 'TENANT' ? <Tab.Screen name="Owner" component={OwnersScreen} /> : null}
      <Tab.Screen name="Security" component={SecurityScreen} />
      <Tab.Screen name="Helpdesk" component={HelpdeskScreen} />
    </Tab.Navigator>
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
          <MaterialCommunityIcons name="arrow-left" size={20} color="#153d63" />
        </TouchableOpacity>
        <Text style={styles.reportTitle}>Payment Report</Text>
      </View>
      <Text style={styles.reportText}>Payment Report functionality will be added in next update.</Text>
    </View>
  );
}

function AppNavigator() {
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  menuPopup: {
    position: 'absolute',
    top: 56,
    right: 12,
    width: 210,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#153d63',
    marginBottom: 4,
  },
  menuSubtitle: {
    color: '#60788f',
    fontSize: 12,
    marginBottom: 10,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    color: '#153d63',
    fontWeight: '700',
  },
  menuItemDanger: {
    color: '#d32f2f',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e8edf2',
    marginVertical: 6,
  },
  reportScreen: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    padding: 16,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    backgroundColor: '#eaf2fb',
    borderRadius: 8,
    padding: 8,
    marginRight: 10,
  },
  reportTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#153d63',
  },
  reportText: {
    color: '#60788f',
    fontSize: 16,
    lineHeight: 24,
  },
});

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
