import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

const palette = {
  pending: { background: '#FEF3C7', text: '#92400E' },
  submitted: { background: '#DBEAFE', text: '#1D4ED8' },
  reviewed: { background: '#E0E7FF', text: '#4338CA' },
  approved: { background: '#DCFCE7', text: '#166534' },
  resolved: { background: '#DCFCE7', text: '#166534' },
  open: { background: '#FDE68A', text: '#92400E' },
  closed: { background: '#DCFCE7', text: '#166534' },
  absent: { background: '#FEE2E2', text: '#991B1B' },
  late: { background: '#FEF3C7', text: '#92400E' },
  present: { background: '#DCFCE7', text: '#166534' },
};

export default function StatusPill({ label }) {
  const key = String(label || '').trim().toLowerCase();
  const selectedPalette = palette[key] || {
    background: colors.backgroundSoft,
    text: colors.secondaryText,
  };

  return (
    <View style={[styles.pill, { backgroundColor: selectedPalette.background }]}>
      <Text style={[styles.text, { color: selectedPalette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
