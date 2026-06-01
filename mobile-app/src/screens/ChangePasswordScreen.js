import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'New password and confirm password do not match.');
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Updated', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Unable to change password', e.message || 'Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current Password" secureTextEntry />
      <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New Password" secureTextEntry />
      <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm New Password" secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Update Password</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f3f1e9' },
  title: { fontSize: 26, fontWeight: '800', color: '#172b31', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#20343a', padding: 12, borderRadius: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
