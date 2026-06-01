import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Page from '../components/Page';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { colors, ui } from '../lib/theme';

export default function NewNoticeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');

  const create = async () => {
    if (!title.trim() || !body.trim()) {
      return Alert.alert('Validation', 'Title and body are required.');
    }
    try {
      await apiRequest('/api/notices', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), category: category.trim().toUpperCase(), status: 'PUBLISHED' }),
      }, token);
      Alert.alert('Saved', 'Notice created successfully.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to create notice.');
    }
  };

  if (String(user?.role || '').toUpperCase() !== 'ADMIN') {
    return (
      <Page>
        <Text style={styles.message}>Only admins may create notices.</Text>
      </Page>
    );
  }

  return (
    <Page>
      <Text style={styles.title}>New Notice</Text>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notice title" />
      <Text style={styles.label}>Body</Text>
      <TextInput style={[styles.input, styles.textArea]} value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Notice message" />
      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="GENERAL" autoCapitalize="characters" />
      <TouchableOpacity style={styles.button} onPress={create}><Text style={styles.buttonText}>Publish</Text></TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: ui.title,
  label: { color: colors.muted, fontWeight: '700', marginTop: 10 },
  input: { ...ui.input, marginTop: 6 },
  textArea: { height: 140 },
  button: { ...ui.primaryButton, marginTop: 18, paddingVertical: 14 },
  buttonText: ui.primaryButtonText,
  message: { color: colors.muted, marginTop: 18, fontSize: 16 },
});
