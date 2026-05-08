import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

export default function Page({ children, refreshControl }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
        <View>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f7fb' },
  content: { padding: 16, paddingBottom: 60 },
});
