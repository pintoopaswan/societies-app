import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (e) {
      setError(e.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Society Mobile</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Username" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#eef3f9' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#26486a', shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  title: { fontSize: 30, fontWeight: '800', color: '#123a63', textAlign: 'center' },
  subtitle: { color: '#6d7f93', textAlign: 'center', marginBottom: 14, marginTop: 4 },
  input: { backgroundColor: '#f8fbff', borderRadius: 10, padding: 12, marginBottom: 10, borderColor: '#d3deea', borderWidth: 1 },
  button: { backgroundColor: '#1f6fb2', padding: 14, borderRadius: 10, marginTop: 4 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  error: { color: '#c53030', marginBottom: 6 },
});
