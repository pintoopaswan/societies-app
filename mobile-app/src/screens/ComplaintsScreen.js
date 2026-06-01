import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { colors, ui } from '../lib/theme';

export default function ComplaintsScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const [complaints, setComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadComplaints = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await apiRequest('/api/complaints', {}, token);
      setComplaints(res.data || []);
    } catch {
      setComplaints([]);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { loadComplaints(); }, [loadComplaints]));

  const updateStatus = async (complaintId, nextStatus) => {
    try {
      await apiRequest(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      }, token);
      loadComplaints();
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to update complaint.');
    }
  };

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadComplaints} />}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Complaints</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewComplaint')}>
          <Text style={styles.addButtonText}>New Complaint</Text>
        </TouchableOpacity>
      </View>

      {complaints.length === 0 ? (
        <Text style={styles.empty}>No complaints found.</Text>
      ) : (
        complaints.map((item) => (
          <View key={String(item.id)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={[styles.status, item.status === 'RESOLVED' ? styles.resolved : item.status === 'IN_PROGRESS' ? styles.inprogress : styles.open]}>{item.status}</Text>
            </View>
            <Text style={styles.cardBody}>{item.description}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{item.block} | {item.flat}</Text>
              <Text style={styles.metaText}>{item.priority || 'NORMAL'}</Text>
            </View>
            <View style={styles.footerRow}>
              {isAdmin ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item.id, item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED')}>
                  <Text style={styles.actionTxt}>{item.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.assigned}>{item.assigned_to ? `Assigned: ${item.assigned_to}` : 'No assignment'}</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  status: { fontWeight: '800' },
  open: { color: '#d97706' },
  inprogress: { color: '#2563eb' },
  resolved: { color: '#16a34a' },
  cardBody: { color: colors.primary, lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { color: colors.muted, fontSize: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { backgroundColor: '#14b8a6', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  actionTxt: { color: '#fff', fontWeight: '700' },
  assigned: { color: colors.muted, fontSize: 12 },
});
