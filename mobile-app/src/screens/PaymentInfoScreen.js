import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { colors as themeColors, radius, ui } from '../lib/theme';

export default function PaymentInfoScreen() {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/payment-info');
      setPaymentInfo(res.data || null);
    } catch {
      setPaymentInfo(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upiId = paymentInfo?.upi_id || '';
  const qrUrl = `${API_BASE_URL}/static/payment-qr.png`;

  const openUpiApp = async () => {
    if (!upiId) return;

    const url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Society Maintenance')}&cu=INR`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('UPI Link not supported', 'Copy the UPI ID and paste it into your UPI app.');
    }
  };

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.title}>Payment Info</Text>

      <View style={styles.card}>
        <Text style={styles.label}>UPI ID</Text>
        <Text style={styles.value}>{upiId || 'Loading...'}</Text>

        <TouchableOpacity style={styles.button} onPress={openUpiApp} disabled={!upiId}>
          <Text style={styles.buttonText}>Open UPI App</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Scan QR</Text>
        <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
      </View>

      <Text style={styles.help}>
        {paymentInfo?.note ||
          'Use the UPI ID or scan the QR code to pay your maintenance fee. After payment, upload the screenshot to payments.'}
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: ui.title,
  card: {
    backgroundColor: themeColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    padding: 14,
  },
  label: {
    color: themeColors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.primary,
    marginBottom: 12,
  },
  button: {
    backgroundColor: themeColors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  qrImage: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    marginTop: 12,
    backgroundColor: themeColors.surfaceSoft,
  },
  help: {
    color: themeColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
