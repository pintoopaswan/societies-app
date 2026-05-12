import React, { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onLogin = async () => {
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Email/mobile and password are required.');
      return;
    }

    try {
      setLoading(true);
      await login(identifier.trim(), password);
    } catch (e) {
      setError(e.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=60' }}
      style={styles.bg}
    >
      <View style={styles.overlay}>
        <View style={styles.headerWrap}>
          <View style={styles.logoWrap}><MaterialCommunityIcons name="office-building" size={30} color="#fff" /></View>
          <Text style={styles.title}>My Society</Text>
          <Text style={styles.subtitle}>Smart society operations for residents, owners, tenants, and admins.</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or Mobile"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={onLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Login'}</Text>
          </TouchableOpacity>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(12,34,56,0.55)', justifyContent: 'center', padding: 22 },
  headerWrap: { marginBottom: 16 },
  logoWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#1f6fb2', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  subtitle: { color: '#dce8f7', marginTop: 4, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#26486a', shadowOpacity: 0.12, shadowRadius: 14, elevation: 4 },
  input: { backgroundColor: '#f8fbff', borderRadius: 10, padding: 12, marginBottom: 10, borderColor: '#d3deea', borderWidth: 1 },
  button: { backgroundColor: '#1f6fb2', padding: 14, borderRadius: 10, marginTop: 4 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  error: { color: '#c53030', marginBottom: 6 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  link: { color: '#1f6fb2', fontWeight: '700' },
});
