import React, { createContext, useContext, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

/**
 * Material Design 3 inspired color tokens
 * Focuses on tonal palettes and surface containers
 */
export const md3Colors = {
  // Brand
  primary: '#0061A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D1E4FF',
  onPrimaryContainer: '#001D36',

  secondary: '#535F70',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D7E3F7',
  onSecondaryContainer: '#101C2B',

  tertiary: '#6B5778',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F2DAFF',
  onTertiaryContainer: '#251431',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Surface
  background: '#FDFCFF',
  onBackground: '#1A1C1E',
  surface: '#FDFCFF',
  onSurface: '#1A1C1E',

  // Surface Containers (MD3 specific)
  surfaceVariant: '#DFE2EB',
  onSurfaceVariant: '#43474E',
  outline: '#73777F',
  outlineVariant: '#C3C7D0',

  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F9FF',
  surfaceContainer: '#F1F4FA',
  surfaceContainerHigh: '#EBEFF4',
  surfaceContainerHighest: '#E2E8F0',

  // Functional aliases
  success: '#16a34a',
  warning: '#d97706',
  info: '#06b6d4',
  muted: '#73777F',

  // Legacy aliases for compatibility
  appBg: '#FDFCFF',
  primaryBlue: '#0061A4',
  accent: '#6B5778',
  accentSoft: '#F2DAFF',
  text: '#1A1C1E',
  border: '#C3C7D0',
  borderStrong: '#73777F',
  danger: '#BA1A1A',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 28,
  pill: 999,
};

// MD3 Elevation levels
export const elevation = {
  level0: { elevation: 0, shadowColor: 'transparent' },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lift: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const typography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
    fontWeight: '400',
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
    fontWeight: '400',
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontWeight: '400',
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: '500',
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '500',
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontWeight: '500',
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontWeight: '400',
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
};

export function getTheme() {
  const colors = md3Colors;
  return {
    mode: 'light',
    dark: false,
    colors,
    radius,
    elevation,
    shadow: elevation, // Alias
    typography,
    styles: createThemeStyles(colors),
  };
}

function createThemeStyles(colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: radius.lg,
      padding: 16,
      ...elevation.level1,
    },
    input: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      borderRadius: radius.sm,
      paddingVertical: 12,
      paddingHorizontal: 16,
      color: colors.onSurface,
      ...typography.bodyLarge,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 10,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimaryText: {
      color: colors.onPrimary,
      ...typography.labelLarge,
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

// Exporting old names as aliases to prevent immediate crashes
export const lightColors = md3Colors;
export const colors = md3Colors;
export const shadow = elevation;
