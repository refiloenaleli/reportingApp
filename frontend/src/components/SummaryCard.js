import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function SummaryCard({ label, value, tone = 'default' }) {
  const toneMap = {
    default: { backgroundColor: colors.backgroundWhite, accent: colors.primaryGold },
    info: { backgroundColor: '#EEF4FF', accent: colors.infoBlue },
    success: { backgroundColor: '#ECFDF3', accent: colors.successGreen },
    warning: { backgroundColor: '#FFF7E8', accent: colors.warningAmber },
    accent: { backgroundColor: '#EEF2FF', accent: colors.accentNavy },
  };
  const selectedTone = toneMap[tone] || toneMap.default;

  return (
    <View style={[styles.card, { backgroundColor: selectedTone.backgroundColor }]}>
      <View style={[styles.accent, { backgroundColor: selectedTone.accent }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 96,
    overflow: 'hidden',
    ...shadows.soft,
  },
  accent: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkText,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
  },
});
