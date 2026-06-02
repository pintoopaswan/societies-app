import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/lib/auth';
import { AppThemeProvider, useAppTheme } from './src/lib/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

function AppShell() {
  const theme = useAppTheme();
  const navigationTheme = {
    dark: false,
    colors: {
      primary: theme.colors.primaryBlue,
      background: theme.colors.appBg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };

  return (
    <>
      <StatusBar style="dark" backgroundColor={theme.colors.appBg} />
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
