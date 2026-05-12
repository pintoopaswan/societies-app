import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Page from '../components/Page';

const SECURITY_NUMBER = '+919900112233';

export default function SecurityScreen() {
  const callSecurity = async () => {
    const url = `tel:${SECURITY_NUMBER}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Call failed', 'Calling is not available on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <Page>
      <Text style={styles.title}>Security</Text>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="security" size={28} color="#0f4c81" />
        </View>
        <Text style={styles.label}>Emergency Contact</Text>
        <Text style={styles.number}>{SECURITY_NUMBER}</Text>
        <TouchableOpacity style={styles.button} onPress={callSecurity}>
          <MaterialIcons name="call" size={18} color="#fff" />
          <Text style={styles.buttonText}>Call Security</Text>
        </TouchableOpacity>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#dbe5ee' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf4fb',
    marginBottom: 10,
  },
  label: { fontSize: 16, color: '#45617c' },
  number: { fontSize: 24, fontWeight: '800', color: '#163852', marginVertical: 10 },
  button: {
    marginTop: 4,
    backgroundColor: '#1162a8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
