import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { colors, ui } from '../lib/theme';

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
          <MaterialIcons name="security" size={28} color={colors.primary} />
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
  title: ui.title,
  card: { ...ui.card, padding: 18 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    marginBottom: 10,
  },
  label: { fontSize: 16, color: colors.muted },
  number: { fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 10 },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { ...ui.primaryButtonText, fontSize: 16 },
});
