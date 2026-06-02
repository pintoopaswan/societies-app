import React, { createContext, useContext, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

export const lightColors = {
  appBg: '#f5f7fb',
  appBgAlt: '#edf3ff',
  surface: '#ffffff',
  surfaceSoft: '#f3f7fb',
  surfaceElevated: '#ffffff',
  primary: '#0f172a',
  primaryBlue: '#2563eb',
  accent: '#7c3aed',
  accentSoft: '#eef2ff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  danger: '#ef4444',
  success: '#16a34a',
  warning: '#d97706',
  info: '#06b6d4',
  cardGlow: 'rgba(37, 99, 235, 0.08)',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  lift: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
};

export const typography = {
  display: Platform.select({
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  heading: Platform.select({
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export function getTheme() {
  const colors = lightColors;
  return {
    mode: 'light',
    dark: false,
    colors,
    radius,
    shadow,
    typography,
    styles: createThemeStyles(colors),
  };
}

function createThemeStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.appBg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      ...shadow.card,
    },
    cardSoft: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontFamily: typography.heading,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: typography.body,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      color: colors.text,
      fontFamily: typography.body,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 13,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimaryText: {
      color: '#ffffff',
      fontWeight: '800',
      letterSpacing: 0.2,
      fontFamily: typography.heading,
    },
    buttonSecondary: {
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      paddingVertical: 13,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSecondaryText: {
      color: colors.text,
      fontWeight: '800',
      fontFamily: typography.heading,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      fontFamily: typography.heading,
    },
  });
}

const ThemeContext = createContext(getTheme());

export function AppThemeProvider({ children }) {
  const theme = useMemo(() => getTheme(), []);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export const colors = lightColors;

export const ui = StyleSheet.create({
  title: {
    color: lightColors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    color: lightColors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.25,
  },
  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 14,
    ...shadow.card,
  },
  input: {
    backgroundColor: lightColors.surface,
    borderWidth: 1,
    borderColor: lightColors.borderStrong,
    borderRadius: radius.md,
    padding: 11,
    color: lightColors.text,
  },
  primaryButton: {
    backgroundColor: lightColors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  emptyText: {
    color: lightColors.muted,
    marginTop: 10,
  },
  row: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 14,
    marginBottom: 10,
    ...shadow.card,
  },
});
