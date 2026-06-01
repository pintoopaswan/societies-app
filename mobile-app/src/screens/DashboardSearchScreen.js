import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

const ALL_ACTIONS = [
  { title: 'Society Dues', aliases: ['payments', 'payment history', 'maintenance'], icon: 'cash-multiple', route: 'PaymentsList', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Payment Info', aliases: ['upi', 'qr', 'pay'], icon: 'qrcode', route: 'PaymentInfo', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Daily Help', aliases: ['helpdesk', 'maintenance contact'], icon: 'account-hard-hat-outline', route: 'Helpdesk', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Resident Directory', aliases: ['directory', 'owners', 'tenants', 'residents'], icon: 'card-account-details-outline', route: 'Directory', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Search Vehicle', aliases: ['vehicle', 'car', 'bike', 'registration'], icon: 'car', route: 'VehicleSearch', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Call Security', aliases: ['security', 'guard', 'emergency'], icon: 'phone-outline', route: 'Security', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Complaints', aliases: ['complaint', 'ticket', 'issue'], icon: 'ticket-outline', route: 'Complaints', roles: ['ADMIN', 'OWNER', 'TENANT'] },
  { title: 'Notices', aliases: ['notice', 'announcement'], icon: 'bell-outline', route: 'Notices', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Expenses', aliases: ['expense', 'spend', 'balance'], icon: 'cash-minus', route: 'ExpensesList', roles: ['ADMIN', 'OWNER', 'TENANT'] },
  { title: 'Visitor Preapprove', aliases: ['visitor', 'pre approve', 'preapprove'], icon: 'account-plus-outline', route: 'Security', roles: ['ADMIN', 'OWNER', 'TENANT', 'GUARD'] },
  { title: 'Pending Requests', aliases: ['registration', 'approval', 'requests'], icon: 'account-clock-outline', route: 'AdminRegistrationRequests', roles: ['ADMIN'] },
  { title: 'Add Payment', aliases: ['new payment'], icon: 'cash-plus', route: 'NewPayment', roles: ['ADMIN'] },
  { title: 'Add Expense', aliases: ['new expense'], icon: 'receipt', route: 'NewExpense', roles: ['ADMIN'] },
  { title: 'Add Owner', aliases: ['new owner'], icon: 'account-plus', route: 'AddOwner', roles: ['ADMIN'] },
  { title: 'Add Tenant', aliases: ['new tenant'], icon: 'account-plus-outline', route: 'AddTenant', roles: ['ADMIN'] },
  { title: 'My Flats', aliases: ['flats', 'tenant list'], icon: 'home-city', route: 'MyFlats', roles: ['OWNER'] },
];

function SearchRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.resultRow} onPress={onPress}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name={item.icon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.resultTitle}>{item.title}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardSearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = String(user?.role || 'TENANT').toUpperCase();
  const [query, setQuery] = useState('');

  const availableActions = useMemo(
    () => ALL_ACTIONS.filter((item) => item.roles.includes(role) || item.roles.includes('GUARD')),
    [role],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return availableActions.slice(0, 6);
    return availableActions.filter((item) => {
      const text = [item.title, ...(item.aliases || [])].join(' ').toLowerCase();
      return text.includes(needle);
    });
  }, [availableActions, query]);

  const openAction = (item) => {
    navigation.navigate(item.route);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={34} color="#202327" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="What are you looking for?"
          placeholderTextColor="#c7c7c7"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>{query.trim() ? 'Search Results' : 'Popular Searches'}</Text>
        {results.length > 0 ? (
          results.map((item) => (
            <SearchRow key={`${item.route}-${item.title}`} item={item} onPress={() => openAction(item)} />
          ))
        ) : (
          <Text style={styles.emptyText}>No matching menu found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginRight: 20 },
  searchInput: { flex: 1, color: '#202327', fontSize: 22, paddingVertical: 8 },
  content: { paddingHorizontal: 18, paddingTop: 30 },
  sectionTitle: { color: '#080808', fontSize: 20, fontWeight: '900', marginBottom: 20 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  resultTitle: { color: '#080808', fontSize: 22, fontWeight: '500' },
  emptyText: { color: colors.muted, fontSize: 16, marginTop: 10 },
});
