import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../styles/theme';
import StatusPill from './StatusPill';

export default function InsightCard({
  title,
  subtitle,
  lines = [],
  status,
  actionLabel,
  onPress,
}) {
  const content = (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {status ? <StatusPill label={status} /> : null}
      </View>
      {lines.filter(Boolean).map((line) => (
        <Text key={`${title}-${line}`} style={styles.line}>
          {line}
        </Text>
      ))}
      {actionLabel ? <Text style={styles.action}>{actionLabel}</Text> : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.darkText,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondaryText,
  },
  line: {
    marginTop: 8,
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  action: {
    marginTop: 10,
    fontSize: 13,
    color: colors.primaryGoldDark,
    fontWeight: '800',
  },
});
