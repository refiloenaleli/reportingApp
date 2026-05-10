import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function ModuleCard({ title, onPress, badge }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{title}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 86,
    justifyContent: 'center',
    ...shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkText,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentPurple,
  },
});
