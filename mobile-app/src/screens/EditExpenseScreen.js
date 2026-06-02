import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { API_BASE_URL } from '../lib/config';
import { safeDateFromIso, toIsoDate } from '../lib/date';

// ─── Design tokens (identical to ExpensesScreen) ──────────────────────────────

const P = {
  bg:           '#F5F6FA',
  surface:      '#FFFFFF',

  ink:          '#0D0F14',
  inkSub:       '#5A6375',
  inkMuted:     '#9BA3B4',

  brand:        '#1A56DB',
  brandSoft:    '#EEF4FF',
  brandMid:     '#C7D8FF',

  emerald:      '#0B8A5E',
  emeraldSoft:  '#ECFDF5',
  emeraldMid:   '#A7F3D0',

  rose:         '#C81E45',
  roseSoft:     '#FFF1F2',
  roseMid:      '#FECDD3',

  amber:        '#C07A10',
  amberSoft:    '#FFFBEB',
  amberMid:     '#FDE68A',

  border:       '#E8EAF0',
  borderSubtle: '#F1F3F8',
};

const SHADOW_SM = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6  },
  android: { elevation: 1 },
  default: {},
});

const SHADOW_MD = Platform.select({
  ios:     { shadowColor: '#0D1526', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12 },
  android: { elevation: 2 },
  default: {},
});

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ title }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
    </View>
  );
}

// ─── FieldCard ────────────────────────────────────────────────────────────────

function FieldCard({ children }) {
  return <View style={styles.fieldCard}>{children}</View>;
}

// ─── FieldRow — generic row inside a FieldCard ────────────────────────────────

function FieldRow({ icon, label, divider, disabled, children }) {
  return (
    <View style={[styles.fieldRow, divider && styles.rowDivider]}>
      <View style={[styles.rowIconWrap, disabled && styles.rowIconWrapDisabled]}>
        <MaterialCommunityIcons name={icon} size={15} color={disabled ? P.inkMuted : P.brand} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

// ─── TextRow ──────────────────────────────────────────────────────────────────

function TextRow({ icon, label, value, onChange, placeholder, keyboardType, multiline, editable = true, divider }) {
  return (
    <FieldRow icon={icon} label={label} divider={divider} disabled={!editable}>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMulti,
          !editable && styles.fieldInputReadOnly,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? '—'}
        placeholderTextColor={P.inkMuted}
        keyboardType={keyboardType ?? 'default'}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </FieldRow>
  );
}

// ─── DateRow ──────────────────────────────────────────────────────────────────

function DateRow({ value, onChange, editable, divider }) {
  const [show, setShow] = useState(false);
  return (
    <FieldRow icon="calendar-outline" label="Transaction Date" divider={divider} disabled={!editable}>
      <TouchableOpacity
        onPress={() => editable && setShow(true)}
        activeOpacity={editable ? 0.7 : 1}
        style={[styles.dateBtn, !editable && styles.fieldInputReadOnly]}
      >
        <Text style={[styles.dateBtnText, !value && { color: P.inkMuted }]}>
          {value || 'Select date'}
        </Text>
        {editable && <MaterialCommunityIcons name="chevron-down" size={15} color={P.inkMuted} />}
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={safeDateFromIso(value)}
          mode="date"
          display="default"
          onChange={(event, d) => {
            setShow(false);
            if (event.type !== 'dismissed' && d) onChange(toIsoDate(d));
          }}
        />
      )}
    </FieldRow>
  );
}

// ─── PaymentModeRow ───────────────────────────────────────────────────────────

function PaymentModeRow({ value, onChange, editable, divider }) {
  const modes = ['ONLINE', 'CASH'];
  return (
    <FieldRow icon="credit-card-outline" label="Payment Mode" divider={divider} disabled={!editable}>
      <View style={styles.modeRow}>
        {modes.map((m) => {
          const active = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => editable && onChange(m)}
              style={[
                styles.modeChip,
                active && styles.modeChipActive,
                !editable && styles.modeChipDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name={m === 'ONLINE' ? 'wifi' : 'cash'}
                size={13}
                color={active ? P.brand : P.inkMuted}
              />
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{m}</Text>
            </Pressable>
          );
        })}
      </View>
    </FieldRow>
  );
}

// ─── BillSection ──────────────────────────────────────────────────────────────

function BillSection({ billUrl, bill, onPick, canManage }) {
  const hasExisting = !!billUrl && !bill;
  const hasNew      = !!bill;

  return (
    <View style={styles.section}>
      <SectionLabel title="Bill / Receipt" />
      <FieldCard>
        {/* Preview */}
        {(hasExisting || hasNew) && (
          <View style={styles.billPreviewWrap}>
            <Image
              source={{ uri: hasNew ? bill.uri : billUrl }}
              style={styles.billPreview}
              resizeMode="cover"
            />
            {hasNew && (
              <View style={styles.billNewBadge}>
                <Text style={styles.billNewBadgeText}>New</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={[styles.billActions, (hasExisting || hasNew) && styles.billActionsDivider]}>
          {hasExisting && (
            <Pressable
              onPress={() => Linking.openURL(billUrl)}
              style={({ pressed }) => [styles.billActionBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <MaterialCommunityIcons name="open-in-new" size={15} color={P.brand} />
              <Text style={styles.billActionBtnText}>View Bill</Text>
            </Pressable>
          )}
          {canManage && (
            <Pressable
              onPress={onPick}
              style={({ pressed }) => [
                styles.billActionBtn,
                styles.billActionBtnReplace,
                hasExisting && styles.billActionBtnBorder,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <MaterialCommunityIcons
                name={(hasExisting || hasNew) ? 'image-edit-outline' : 'upload-outline'}
                size={15}
                color={P.inkSub}
              />
              <Text style={[styles.billActionBtnText, { color: P.inkSub }]}>
                {(hasExisting || hasNew) ? 'Replace Bill' : 'Upload Bill'}
              </Text>
            </Pressable>
          )}
          {!hasExisting && !hasNew && !canManage && (
            <View style={styles.billEmpty}>
              <MaterialCommunityIcons name="receipt-text-remove-outline" size={18} color={P.inkMuted} />
              <Text style={styles.billEmptyText}>No bill attached</Text>
            </View>
          )}
        </View>
      </FieldCard>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditExpenseScreen({ route, navigation }) {
  const { token, user } = useAuth();
  const insets     = useSafeAreaInsets();
  const canManage  = String(user?.role || '').toUpperCase() === 'ADMIN';
  const expenseParams = route?.params ?? {};
  const expense = expenseParams.expense ?? null;
  const onSaved = expenseParams.onSaved;

  const [form, setForm] = useState({
    transaction_date:  expense?.transaction_date    || toIsoDate(new Date()),
    item_name:         expense?.item_name           || '',
    quantity:          String(expense?.quantity     || ''),
    amount:            String(expense?.amount       || ''),
    payment_mode:      expense?.payment_mode        || 'ONLINE',
    paid_by:           expense?.paid_by             || '',
    existing_bill_path: expense?.bill_image_path    || '',
  });
  const [bill, setBill] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickBill = () => {
    if (!canManage) return;
    Alert.alert('Upload Bill', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: 'bill.jpg', type: r.assets[0].mimeType || 'image/jpeg' });
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: 'bill.jpg', type: r.assets[0].mimeType || 'image/jpeg' });
        },
      },
      {
        text: 'PDF / File',
        onPress: async () => {
          const r = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
          if (!r.canceled && r.assets?.[0]) setBill({ uri: r.assets[0].uri, name: r.assets[0].name || 'bill.pdf', type: r.assets[0].mimeType || 'application/pdf' });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!form.transaction_date)           return Alert.alert('Validation', 'Transaction date is required.');
    if (!form.item_name.trim())           return Alert.alert('Validation', 'Item name is required.');
    if (!form.amount)                     return Alert.alert('Validation', 'Amount is required.');
    if (!Number(form.amount) || Number(form.amount) <= 0)
                                          return Alert.alert('Validation', 'Amount must be greater than 0.');
    if (!['ONLINE', 'CASH'].includes(form.payment_mode))
                                          return Alert.alert('Validation', 'Payment mode must be CASH or ONLINE.');
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, String(v ?? '')));
      if (bill) body.append('bill', bill);
      const res  = await fetch(`${API_BASE_URL}/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      onSaved?.();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = () => {
    Alert.alert('Delete Expense', 'This action cannot be undone. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res  = await fetch(`${API_BASE_URL}/api/expenses/${expense.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            onSaved?.();
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const billUrl = form.existing_bill_path ? `${API_BASE_URL}/static/${form.existing_bill_path}` : '';

  if (!expense) {
    return (
      <View style={[styles.missingRoot, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.missingCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={28} color={P.rose} />
          <Text style={styles.missingTitle}>Expense details unavailable</Text>
          <Text style={styles.missingText}>
            This screen needs an expense record to edit. Open it from an expense item, or go back to the previous screen.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.missingButton, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.missingButtonText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>Finance</Text>
          <Text style={styles.headerTitle}>Expense Details</Text>
        </View>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialCommunityIcons name="close" size={20} color={P.inkSub} />
        </Pressable>
      </View>

      {/* ── Read-only banner for non-admin ──────────────────────────────── */}
      {!canManage && (
        <View style={styles.readOnlyBanner}>
          <MaterialCommunityIcons name="eye-outline" size={15} color={P.amber} />
          <Text style={styles.readOnlyBannerText}>You have view-only access to this expense.</Text>
        </View>
      )}

      {/* ── Transaction info ────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Transaction Info" />
        <FieldCard>
          <DateRow
            value={form.transaction_date}
            onChange={(v) => set('transaction_date', v)}
            editable={canManage}
          />
          <TextRow
            icon="text-short"
            label="Item Name"
            value={form.item_name}
            onChange={(v) => set('item_name', v)}
            placeholder="e.g. Plumbing repair"
            editable={canManage}
            divider
          />
          <TextRow
            icon="counter"
            label="Quantity"
            value={form.quantity}
            onChange={(v) => set('quantity', v)}
            placeholder="e.g. 2"
            keyboardType="decimal-pad"
            editable={canManage}
            divider
          />
          <TextRow
            icon="currency-inr"
            label="Amount (₹)"
            value={form.amount}
            onChange={(v) => set('amount', v)}
            placeholder="0"
            keyboardType="decimal-pad"
            editable={canManage}
            divider
          />
        </FieldCard>
      </View>

      {/* ── Payment info ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionLabel title="Payment Info" />
        <FieldCard>
          <PaymentModeRow
            value={form.payment_mode}
            onChange={(v) => set('payment_mode', v)}
            editable={canManage}
          />
          <TextRow
            icon="account-outline"
            label="Paid By"
            value={form.paid_by}
            onChange={(v) => set('paid_by', v)}
            placeholder="Name of payer"
            editable={canManage}
            divider
          />
        </FieldCard>
      </View>

      {/* ── Bill / Receipt ──────────────────────────────────────────────── */}
      <BillSection
        billUrl={billUrl}
        bill={bill}
        onPick={pickBill}
        canManage={canManage}
      />

      {/* ── Admin actions ───────────────────────────────────────────────── */}
      {canManage && (
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={submit}
            activeOpacity={0.82}
            disabled={saving}
          >
            <MaterialCommunityIcons name={saving ? 'loading' : 'content-save-outline'} size={17} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={del} activeOpacity={0.82}>
            <MaterialCommunityIcons name="trash-can-outline" size={17} color={P.rose} />
            <Text style={styles.deleteBtnText}>Delete Expense</Text>
          </TouchableOpacity>
        </View>
      )}

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
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 20,
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

  // ── Read-only banner ─────────────────────────────────────────────────────────
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.amberSoft,
    borderWidth: 1,
    borderColor: P.amberMid,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  readOnlyBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: P.amber,
    lineHeight: 17,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // ── Field row ────────────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 58,
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
    marginTop: 2,
    flexShrink: 0,
  },
  rowIconWrapDisabled: {
    backgroundColor: P.borderSubtle,
    borderColor: P.border,
  },
  rowBody: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.inkMuted,
    marginBottom: 4,
  },

  // ── Text input ───────────────────────────────────────────────────────────────
  fieldInput: {
    fontSize: 14,
    fontWeight: '500',
    color: P.ink,
    paddingVertical: 0,
  },
  fieldInputMulti: {
    minHeight: 72,
    lineHeight: 20,
  },
  fieldInputReadOnly: {
    color: P.inkSub,
  },

  // ── Date button ──────────────────────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: P.ink,
  },

  // ── Payment mode chips ───────────────────────────────────────────────────────
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.borderSubtle,
    borderWidth: 1,
    borderColor: P.border,
  },
  modeChipActive: {
    backgroundColor: P.brandSoft,
    borderColor: P.brandMid,
  },
  modeChipDisabled: {
    opacity: 0.6,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.inkMuted,
    letterSpacing: 0.3,
  },
  modeChipTextActive: {
    color: P.brand,
  },

  // ── Bill section ─────────────────────────────────────────────────────────────
  billPreviewWrap: {
    position: 'relative',
  },
  billPreview: {
    width: '100%',
    height: 180,
    backgroundColor: P.borderSubtle,
  },
  billNewBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: P.emerald,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  billNewBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  billActions: {
    flexDirection: 'row',
    gap: 0,
  },
  billActionsDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P.borderSubtle,
  },
  billActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  billActionBtnReplace: {
    // no extra style needed; color passed inline
  },
  billActionBtnBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: P.borderSubtle,
  },
  billActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.brand,
  },
  billEmpty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  billEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: P.inkMuted,
  },

  // ── Actions ──────────────────────────────────────────────────────────────────
  actionsSection: {
    marginTop: 28,
    gap: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.brand,
    borderRadius: 16,
    paddingVertical: 16,
    ...SHADOW_MD,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.roseSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.roseMid,
    paddingVertical: 14,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: P.rose,
    letterSpacing: 0.2,
  },
  missingRoot: {
    flex: 1,
    backgroundColor: P.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  missingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    ...SHADOW_MD,
  },
  missingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: P.ink,
    textAlign: 'center',
  },
  missingText: {
    fontSize: 14,
    lineHeight: 21,
    color: P.inkSub,
    textAlign: 'center',
  },
  missingButton: {
    marginTop: 6,
    backgroundColor: P.brand,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  missingButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
