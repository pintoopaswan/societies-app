import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, StatusBar } from 'react-native';
import { useAppTheme } from '../lib/theme';

export default function Page({ children, refreshControl, contentStyle, noScroll = false }) {
  const { colors, dark } = useAppTheme();

  const content = (
    <View style={[styles.innerContent, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {noScroll ? (
        content
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  content: {
    paddingBottom: 88,
  },
  innerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },
});
