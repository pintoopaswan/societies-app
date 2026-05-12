import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Page from '../components/Page';

const CONTACTS = [
  { role: 'Secretary', phone: '+919900001111' },
  { role: 'Cashier', phone: '+919900002222' },
  { role: 'Maintenance', phone: '+919900003333' },
];

export default function HelpdeskScreen() {
  const callContact = async (phone) => {
    const url = `tel:${phone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Call failed', 'Calling is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Page>
      <Text style={styles.title}>Helpdesk</Text>
      <View style={styles.listWrap}>
        {CONTACTS.map((contact) => (
          <View style={styles.row} key={contact.role}>
            <View>
              <Text style={styles.role}>{contact.role}</Text>
              <Text style={styles.phone}>{contact.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={() => callContact(contact.phone)}>
              <MaterialIcons name="call" size={16} color="#fff" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  listWrap: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dbe5ee' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  role: { fontSize: 16, fontWeight: '700', color: '#1d3c58' },
  phone: { marginTop: 2, fontSize: 14, color: '#5f7690' },
  callButton: {
    backgroundColor: '#1162a8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callButtonText: { color: '#fff', fontWeight: '700' },
});
