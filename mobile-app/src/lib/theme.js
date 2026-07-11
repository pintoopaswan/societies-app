import React, { createContext, useContext, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

/**
 * Material Design 3 inspired Dark Premium color tokens
 * High-contrast, vibrant accents on deep charcoal/black surfaces
 */
export const md3Colors = {
  // Brand - Dark Premium & Electric Accents
  primary: '#A855F7', // Electric Purple
  onPrimary: '#FFFFFF',
  primaryContainer: '#3B0764', // Deep Purple Container
  onPrimaryContainer: '#F3E8FF',

  secondary: '#14B8A6', // Neon Teal
  onSecondary: '#FFFFFF',
  secondaryContainer: '#042F2E',
  onSecondaryContainer: '#CCFBF1',

  tertiary: '#3B82F6', // Vibrant Blue
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#172554',
  onTertiaryContainer: '#DBEAFE',

  error: '#EF4444', // Vivid Red
  onError: '#FFFFFF',
  errorContainer: '#450A0A',
  onErrorContainer: '#FEE2E2',

  // Surface - Deep Charcoal & Pure Black
  background: '#0B0B0B',
  onBackground: '#F9FAFB',
  surface: '#121212',
  onSurface: '#F9FAFB',

  // Surface Containers (MD3 specific)
  surfaceVariant: '#1E1E1E',
  onSurfaceVariant: '#9CA3AF',
  outline: '#374151',
  outlineVariant: '#1F2937',

  surfaceContainerLowest: '#050505',
  surfaceContainerLow: '#0F0F0F',
  surfaceContainer: '#181818',
  surfaceContainerHigh: '#222222',
  surfaceContainerHighest: '#2D2D2D',

  // Functional aliases
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  info: '#3B82F6', // Blue
  muted: '#6B7280',

  // Legacy aliases for compatibility
  appBg: '#0B0B0B',
  primaryBlue: '#A855F7',
  accent: '#14B8A6',
  accentSoft: '#042F2E',
  text: '#F9FAFB',
  border: '#374151',
  borderStrong: '#4B5563',
  danger: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.7)',
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

// MD3 Elevation levels for Dark Mode
// Note: In dark mode, we often use semi-transparent white overlays or
// subtle borders instead of heavy black shadows.
export const elevation = {
  level0: { elevation: 0, shadowColor: 'transparent' },
  level1: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  level2: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  lift: {
    shadowColor: '#A855F7', // Themed glow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const typography = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: -0.25,
    fontWeight: '700',
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
    fontWeight: '700',
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
    fontWeight: '700',
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontWeight: '700',
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontWeight: '700',
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: '700',
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '600',
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontWeight: '600',
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
};

export function getTheme() {
  const colors = md3Colors;
  return {
    mode: 'dark',
    dark: true,
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
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      color: colors.onSurface,
      ...typography.bodyLarge,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimaryText: {
      color: colors.onPrimary,
      ...typography.labelLarge,
      fontWeight: '700',
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
