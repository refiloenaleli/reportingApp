import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export default function EmptyState({ title, message }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.darkText,
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
  },
});
