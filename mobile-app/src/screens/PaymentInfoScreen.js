import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { colors, radius, ui } from '../lib/theme';

const PAYMENT_QR_URL = `${API_BASE_URL}/static/payment-qr.png`;

export default function PaymentInfoScreen() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/payment-info');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openUPI = async () => {
    if (!data?.upi_id) return;
    const url = `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${encodeURIComponent('Society Maintenance')}&cu=INR`;
    try {
      await Linking.openURL(url);
      return;
    } catch {
      Alert.alert('UPI Link not supported', 'Copy the UPI ID and paste it into your UPI app.');
    }
  };

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>Payment Info</Text>
      <View style={styles.card}>
        <Text style={styles.label}>UPI ID</Text>
        <Text style={styles.value}>{data?.upi_id || 'Loading...'}</Text>
        <TouchableOpacity style={styles.button} onPress={openUPI}><Text style={styles.buttonText}>Open UPI App</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Scan QR</Text>
        <Image source={{ uri: PAYMENT_QR_URL }} style={styles.qrImage} resizeMode="contain" />
      </View>
      <Text style={styles.help}>{data?.note || 'Use the UPI ID or scan the QR code to pay your maintenance fee. After payment, upload the screenshot to payments.'}</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: ui.title,
  card: { ...ui.card, marginBottom: 14 },
  label: { color: colors.muted, fontWeight: '700', marginBottom: 6 },
  value: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  button: ui.primaryButton,
  buttonText: ui.primaryButtonText,
  qrImage: { width: '100%', height: 240, borderRadius: radius.md, marginTop: 12, backgroundColor: colors.surfaceSoft },
  help: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
