import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { colors, ui } from '../lib/theme';

export default function NoticesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [notices, setNotices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotices = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/notices');
      setNotices(res.data || []);
    } catch {
      setNotices([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotices(); }, [loadNotices]));

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadNotices} />}> 
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notices</Text>
        {isAdmin ? (
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewNotice')}>
            <Text style={styles.addButtonText}>New Notice</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {notices.length === 0 ? (
        <Text style={styles.empty}>No notices available yet.</Text>
      ) : (
        notices.map((notice) => (
          <View key={String(notice.id)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{notice.title}</Text>
              <Text style={styles.status}>{notice.category}</Text>
            </View>
            <Text style={styles.cardBody}>{notice.body}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{notice.published_at || notice.created_at || ''}</Text>
              <Text style={styles.statusSmall}>{notice.status}</Text>
            </View>
          </View>
        ))
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { ...ui.title, marginBottom: 0 },
  addButton: ui.primaryButton,
  addButtonText: ui.primaryButtonText,
  empty: ui.emptyText,
  card: ui.row,
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  status: { color: colors.primaryBlue, fontWeight: '700' },
  cardBody: { color: colors.primary, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { color: colors.muted, fontSize: 12 },
  statusSmall: { color: colors.primary, fontWeight: '700', fontSize: 12 },
});
