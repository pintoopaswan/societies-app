import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/lib/auth';
import LoginScreen from './src/screens/LoginScreen';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Owners" component={OwnersScreen} />
      <Tab.Screen name="Tenants" component={TenantsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="NewPayment" component={NewPaymentScreen} options={{ title: 'New Payment' }} />
          <Stack.Screen name="NewExpense" component={NewExpenseScreen} options={{ title: 'New Expense' }} />
          <Stack.Screen name="EditExpense" component={EditExpenseScreen} options={{ title: 'Edit Expense' }} />
          <Stack.Screen name="EditPayment" component={EditPaymentScreen} options={{ title: 'Edit Payment' }} />
          <Stack.Screen name="OwnerDetails" component={OwnerDetailsScreen} options={{ title: 'Owner Details' }} />
          <Stack.Screen name="TenantDetails" component={TenantDetailsScreen} options={{ title: 'Tenant Details' }} />
          <Stack.Screen name="AddTenant" component={AddTenantScreen} options={{ title: 'Add Tenant' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
