import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const [identifier, setIdentifier] = useState('');

  const submit = async () => {
    if (!identifier.trim()) {
      Alert.alert('Missing details', 'Please enter email or mobile number.');
      return;
    }
    try {
      await forgotPassword(identifier.trim());
      Alert.alert('Request received', 'OTP based password reset will be implemented next.');
    } catch (e) {
      Alert.alert('Unable to submit', e.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email/mobile to receive an OTP reset link/code.</Text>
      <TextInput style={styles.input} placeholder="Email or Mobile" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Send OTP</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f7fb' },
  title: { fontSize: 26, fontWeight: '800', color: '#153d63', marginBottom: 8 },
  subtitle: { color: '#60788f', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d2dfeb', borderRadius: 10, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#1f6fb2', padding: 12, borderRadius: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
