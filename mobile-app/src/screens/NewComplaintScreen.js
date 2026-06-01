import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';
import Page from '../components/Page';
import { colors, ui } from '../lib/theme';

const BLOCKS = ['Block-1','Block-2','Block-3','Block-4','Block-5','Block-6','Block-7','Block-8','Block-9'];
const FLATS = Array.from({ length: 9 }, (_, floor) => floor + 1).flatMap((floor) => Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`));

export default function NewComplaintScreen() {
  const { user, token } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const [block, setBlock] = useState(BLOCKS.includes(user?.block) ? user.block : 'Block-1');
  const [flat, setFlat] = useState(FLATS.includes(user?.flat) ? user.flat : '101');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const canChooseFlat = role === 'ADMIN';
  const flatOptions = useMemo(() => FLATS, []);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert('Validation', 'Title and description are required.');
    }
    if (!block || !flat) {
      return Alert.alert('Validation', 'Block and flat are required.');
    }
    try {
      await apiRequest('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim(), block, flat }),
      }, token);
      Alert.alert('Submitted', 'Your complaint has been logged.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to raise complaint.');
    }
  };

  return (
    <Page>
      <Text style={styles.title}>Raise Complaint</Text>
      <Text style={styles.label}>Block</Text>
      <View style={[styles.input, styles.pickerWrap, !canChooseFlat && styles.inputDisabled]}>
        <Picker
          selectedValue={block}
          onValueChange={(value) => setBlock(value)}
          enabled={canChooseFlat}
          style={styles.picker}
        >
          {BLOCKS.map((item) => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>
      </View>
      <Text style={styles.label}>Flat</Text>
      <View style={[styles.input, styles.pickerWrap, !canChooseFlat && styles.inputDisabled]}>
        <Picker
          selectedValue={flat}
          onValueChange={(value) => setFlat(value)}
          enabled={canChooseFlat}
          style={styles.picker}
        >
          {flatOptions.map((item) => (
            <Picker.Item key={item} label={item} value={item} />
          ))}
        </Picker>
      </View>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Complaint title" />
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Describe the issue" />
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Submit Complaint</Text>
      </TouchableOpacity>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: ui.title,
  label: { color: colors.muted, fontWeight: '700', marginTop: 10 },
  input: { ...ui.input, marginTop: 6 },
  textArea: { minHeight: 140, textAlignVertical: 'top' },
  pickerWrap: { paddingHorizontal: 0, paddingVertical: 0 },
  picker: { width: '100%' },
  inputDisabled: { opacity: 0.6 },
  button: { ...ui.primaryButton, marginTop: 18, paddingVertical: 14 },
  buttonText: ui.primaryButtonText,
});
