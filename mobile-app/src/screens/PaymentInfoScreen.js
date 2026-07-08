import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAppTheme } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  SettingsRow,
} from '../components/DesignSystem';

export default function PaymentInfoScreen() {
  const { colors, radius, shadow } = useAppTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiRequest('/api/payment-info').then((res) => setData(res.data)).catch(() => {});
  }, []);

  return (
    <Page>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primaryBlue }]}>Collections</Text>
        <Text style={[styles.title, { color: colors.text }]}>Payment Details</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Use these details to pay your monthly maintenance.</Text>
      </View>

      <Surface style={styles.card}>
        <SectionHeader title="Digital Payment" />
        <View style={styles.qrContainer}>
          {data?.qr_url ? (
            <Surface style={styles.qrSurface}>
              <Image source={{ uri: data.qr_url }} style={styles.qrImage} resizeMode="contain" />
            </Surface>
          ) : (
            <Surface style={[styles.qrSurface, styles.qrPlaceholder, { backgroundColor: colors.surfaceSoft }]}>
              <MaterialCommunityIcons name="qrcode-remove" size={48} color={colors.borderStrong} />
              <Text style={{ color: colors.muted, marginTop: 8, fontWeight: '600' }}>QR not available</Text>
            </Surface>
          )}
          <Text style={[styles.qrHint, { color: colors.muted }]}>Scan QR code using any UPI app</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.details}>
          <SettingsRow
            icon="upi"
            label="UPI ID"
            value={data?.upi_id || 'society@upi'}
            tone="blue"
            onPress={() => Alert.alert('Copied', 'UPI ID copied to clipboard.')}
          />
          <SettingsRow
            icon="information-outline"
            label="Note"
            value={data?.note || 'Upload screenshot after payment.'}
            tone="default"
            isLast
          />
        </View>
      </Surface>

      <View style={styles.instructions}>
        <Text style={[styles.instTitle, { color: colors.text }]}>How to pay?</Text>
        <View style={styles.step}>
          <Badge label="1" tone="info" />
          <Text style={[styles.stepText, { color: colors.muted }]}>Scan the QR or copy the UPI ID above.</Text>
        </View>
        <View style={styles.step}>
          <Badge label="2" tone="info" />
          <Text style={[styles.stepText, { color: colors.muted }]}>Complete payment in your preferred app.</Text>
        </View>
        <View style={styles.step}>
          <Badge label="3" tone="info" />
          <Text style={[styles.stepText, { color: colors.muted }]}>Go to "Add Payment" and upload the screenshot.</Text>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24, paddingHorizontal: 2 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 8, lineHeight: 22 },
  card: { padding: 20 },
  qrContainer: { alignItems: 'center', marginVertical: 12 },
  qrSurface: { padding: 12, borderRadius: 20 },
  qrImage: { width: 200, height: 200 },
  qrPlaceholder: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  qrHint: { marginTop: 16, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 20 },
  details: { paddingHorizontal: 0 },
  instructions: { marginTop: 32, gap: 16, paddingHorizontal: 4 },
  instTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
