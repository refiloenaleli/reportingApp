import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export default function FilterChips({ options, value, onChange }) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.chip, active && styles.activeChip]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.text, active && styles.activeText]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundWhite,
  },
  activeChip: {
    borderColor: colors.primaryGold,
    backgroundColor: '#FBF4D6',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  activeText: {
    color: colors.primaryGoldDark,
  },
});
