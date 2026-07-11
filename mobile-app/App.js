import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/lib/auth';
import { AppThemeProvider, useAppTheme } from './src/lib/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

function AppShell() {
  const theme = useAppTheme();
  const navigationTheme = {
    dark: theme.dark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} backgroundColor={theme.colors.background} />
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </AppThemeProvider>
  );
}
