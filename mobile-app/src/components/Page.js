import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../lib/theme';

export default function Page({ children, refreshControl, contentStyle }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.appBg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: colors.appBg }, contentStyle]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        <View>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 88,
    gap: 14,
  },
});
