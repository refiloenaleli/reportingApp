import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export default function OptionSelector({ label, options, value, onChange, error }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const selected = option === value;

          return (
            <Pressable
              key={option}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundWhite,
  },
  optionSelected: {
    borderColor: colors.primaryGold,
    backgroundColor: '#FBF4D6',
  },
  optionText: {
    fontSize: 13,
    color: colors.darkText,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.primaryGold,
  },
  error: {
    marginTop: 6,
    color: colors.dangerRed,
    fontSize: 12,
  },
});
