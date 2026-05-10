import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function StatCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.lightGray,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryGold,
  },
  label: {
    marginTop: 8,
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
});
