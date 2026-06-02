import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';

// ─── Data ─────────────────────────────────────────────────────────────────────

const BLOCKS = ['Block-1','Block-2','Block-3','Block-4','Block-5','Block-6','Block-7','Block-8','Block-9'];
const FLATS  = Array.from({ length: 9 }, (_, floor) => floor + 1)
  .flatMap((floor) => Array.from({ length: 8 }, (_, unit) => `${floor}${String(unit + 1).padStart(2, '0')}`));

// ─── Design tokens (identical to ComplaintsScreen) ────────────────────────────

const P = {
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',
  surfacePress: '#F8F9FF',

  ink:          '#0D0F14',
  inkSub:       '#5A6375',
  inkMuted:     '#9BA3B4',

  brand:        '#1A56DB',
  brandSoft:    '#EEF4FF',
  brandMid:     '#C7D8FF',

  emerald:      '#0B8A5E',
  emeraldSoft:  '#ECFDF5',
  emeraldMid:   '#A7F3D0',

  amber:        '#C07A10',
  amberSoft:    '#FFFBEB',
  amberMid:     '#FDE68A',

  rose:         '#C81E45',
  roseSoft:     '#FFF1F2',
  roseMid:      '#FECDD3',

  slate:        '#475569',
  slateSoft:    '#F1F5F9',

  border:       '#E8EAF0',
  borderSubtle: '#F1F3F8',
};

const SHADOW_SM = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
  android: { elevation: 1 },
  default: {},
});

const SHADOW_MD = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
  android: { elevation: 2 },
  default: {},
});

// ─── SectionLabel (shared pattern from ComplaintsScreen) ──────────────────────

function SectionLabel({ title }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
    </View>
  );
}

// ─── FieldCard — groups one or more fields in a surface card ──────────────────

function FieldCard({ children }) {
  return (
    <View style={styles.fieldCard}>
      {children}
    </View>
  );
}

// ─── PickerRow — single row inside a FieldCard ────────────────────────────────

function PickerRow({ icon, label, value, items, onChange, enabled = true, divider = false }) {
  return (
    <View style={[styles.pickerRow, divider && styles.rowDivider]}>
      <View style={styles.rowIconWrap}>
        <MaterialCommunityIcons name={icon} size={15} color={enabled ? P.brand : P.inkMuted} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={[styles.pickerWrap, !enabled && styles.rowDisabled]}>
          <Picker
            selectedValue={value}
            onValueChange={onChange}
            enabled={enabled}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {items.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

// ─── TextRow — single text-input row inside a FieldCard ───────────────────────

function TextRow({ icon, label, value, onChange, placeholder, multiline = false, divider = false }) {
  return (
    <View style={[styles.textRow, divider && styles.rowDivider, multiline && styles.textRowTall]}>
      <View style={[styles.rowIconWrap, multiline && { marginTop: 2 }]}>
        <MaterialCommunityIcons name={icon} size={15} color={P.brand} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput
          style={[styles.textInput, multiline && styles.textInputMulti]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={P.inkMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewComplaintScreen() {
  const navigation  = useNavigation();
  const { user, token } = useAuth();
  const insets      = useSafeAreaInsets();

  const role        = String(user?.role || '').toUpperCase();
  const canChoose   = role === 'ADMIN';

  const [block,       setBlock]       = useState(BLOCKS.includes(user?.block) ? user.block : 'Block-1');
  const [flat,        setFlat]        = useState(FLATS.includes(user?.flat)   ? user.flat  : '101');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  const flatOptions = useMemo(() => FLATS, []);

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert('Validation', 'Title and description are required.');
    }
    if (!block || !flat) {
      return Alert.alert('Validation', 'Block and flat are required.');
    }
    setSubmitting(true);
    try {
      await apiRequest('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim(), block, flat }),
      }, token);
      Alert.alert('Submitted', 'Your complaint has been logged.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Unable to raise complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Support</Text>
          <Text style={styles.headerTitle}>New Complaint</Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="close" size={20} color={P.inkSub} />
        </Pressable>
      </View>

      {/* ── Hint banner (non-admins) ────────────────────────────────────────── */}
      {!canChoose && (
        <View style={styles.hintBanner}>
          <MaterialCommunityIcons name="information-outline" size={15} color={P.brand} />
          <Text style={styles.hintText}>
            Location is set to your registered unit. Contact admin to change it.
          </Text>
        </View>
      )}

      {/* ── Location ────────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Location" />
        <FieldCard>
          <PickerRow
            icon="office-building-outline"
            label="Block"
            value={block}
            items={BLOCKS}
            onChange={setBlock}
            enabled={canChoose}
          />
          <PickerRow
            icon="door-open"
            label="Flat"
            value={flat}
            items={flatOptions}
            onChange={setFlat}
            enabled={canChoose}
            divider
          />
        </FieldCard>
      </View>

      {/* ── Complaint details ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Complaint Details" />
        <FieldCard>
          <TextRow
            icon="text-short"
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="e.g. Water leakage in bathroom"
          />
          <TextRow
            icon="text-long"
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Describe the issue in detail…"
            multiline
            divider
          />
        </FieldCard>
      </View>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
        onPress={submit}
        activeOpacity={0.82}
        disabled={!isValid || submitting}
      >
        <MaterialCommunityIcons
          name={submitting ? 'loading' : 'send-outline'}
          size={17}
          color="#fff"
        />
        <Text style={styles.submitText}>
          {submitting ? 'Submitting…' : 'Submit Complaint'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: P.bg,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 18,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.brand,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: P.ink,
    lineHeight: 34,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW_SM,
  },

  // ── Hint banner ─────────────────────────────────────────────────────────────
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: P.brand,
    lineHeight: 17,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: P.inkSub,
  },

  // ── Field card ──────────────────────────────────────────────────────────────
  fieldCard: {
    backgroundColor: P.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
    ...SHADOW_MD,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.borderSubtle,
  },

  // ── Shared row layout ────────────────────────────────────────────────────────
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 56,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 56,
  },
  textRowTall: {
    alignItems: 'flex-start',
    paddingVertical: 14,
    minHeight: 130,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: P.brandSoft,
    borderWidth: 1,
    borderColor: P.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.inkMuted,
    marginBottom: 3,
  },
  rowDisabled: {
    opacity: 0.5,
  },

  // ── Picker ───────────────────────────────────────────────────────────────────
  pickerWrap: {
    marginHorizontal: -4,
  },
  picker: {
    width: '100%',
    color: P.ink,
  },
  pickerItem: {
    fontSize: 14,
    fontWeight: '600',
    color: P.ink,
  },

  // ── Text input ───────────────────────────────────────────────────────────────
  textInput: {
    fontSize: 14,
    fontWeight: '500',
    color: P.ink,
    paddingVertical: 2,
  },
  textInputMulti: {
    minHeight: 90,
    lineHeight: 20,
  },

  // ── Submit button ────────────────────────────────────────────────────────────
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    backgroundColor: P.brand,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    ...SHADOW_MD,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});