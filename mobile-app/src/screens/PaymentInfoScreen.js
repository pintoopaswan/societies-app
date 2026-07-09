import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Page from '../components/Page';
import { apiRequest } from '../lib/api';
import { useAppTheme, typography } from '../lib/theme';
import {
  SectionHeader,
  Surface,
  Badge,
  SettingsRow,
} from '../components/DesignSystem';

export default function PaymentInfoScreen() {
  const { colors, radius } = useAppTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiRequest('/api/payment-info').then((res) => setData(res.data)).catch(() => {});
  }, []);

  return (
    <Page>
      <Surface level={2} style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryContainer }]}>
          <MaterialCommunityIcons name="qrcode-scan" size={32} color={colors.onPrimaryContainer} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Payment Details</Text>
        <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
          Use the details below to securely pay your society maintenance and dues.
        </Text>
      </Surface>

      <Surface level={1} style={styles.card}>
        <SectionHeader title="Scan & Pay" subtitle="Instant UPI payment via QR code." />
        <View style={styles.qrContainer}>
          {data?.qr_url ? (
            <Surface level={2} style={styles.qrSurface}>
              <Image source={{ uri: data.qr_url }} style={styles.qrImage} resizeMode="contain" />
            </Surface>
          ) : (
            <Surface level={2} style={[styles.qrSurface, styles.qrPlaceholder]}>
              <MaterialCommunityIcons name="qrcode-remove" size={48} color={colors.outline} />
              <Text style={{ color: colors.onSurfaceVariant, marginTop: 12, ...typography.labelLarge }}>QR not available</Text>
            </Surface>
          )}
          <Text style={[styles.qrHint, { color: colors.onSurfaceVariant }]}>Supports all major UPI apps</Text>
        </View>

        <View style={styles.details}>
          <SettingsRow
            icon="identifier"
            label="UPI ID"
            value={data?.upi_id || 'society@upi'}
            tone="primary"
            onPress={() => Alert.alert('Copied', 'UPI ID copied to clipboard.')}
          />
          <SettingsRow
            icon="information"
            label="Note"
            value={data?.note || 'Please upload the payment screenshot after completion.'}
            isLast
          />
        </View>
      </Surface>

      <View style={styles.instructions}>
        <Text style={[styles.instTitle, { color: colors.onSurface }]}>Payment Guide</Text>
        <View style={styles.step}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.onSurfaceVariant }]}>Scan the QR or copy the UPI ID listed above.</Text>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.onSurfaceVariant }]}>Authorize and complete the transfer in your payment app.</Text>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.onSurfaceVariant }]}>Go to the 'History' tab and 'Record' your payment with the screenshot.</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 24, borderRadius: radius.xxl, marginBottom: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { ...typography.headlineSmall, fontWeight: '700', marginBottom: 8 },
  heroSubtitle: { ...typography.bodyLarge, lineHeight: 22 },
  card: { padding: 24, borderRadius: radius.xl },
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrSurface: { padding: 16, borderRadius: 24 },
  qrImage: { width: 220, height: 220 },
  qrPlaceholder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  qrHint: { marginTop: 16, ...typography.labelLarge, fontWeight: '700' },
  details: { marginTop: 8 },
  instructions: { marginTop: 32, gap: 20 },
  instTitle: { ...typography.titleLarge, fontWeight: '700', marginBottom: 4, marginLeft: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', ...typography.labelLarge, fontWeight: '900' },
  stepText: { flex: 1, ...typography.bodyMedium, fontWeight: '700' },
});
