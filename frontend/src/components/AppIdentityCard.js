import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ROLE_LABELS } from '../constants/appData';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function AppIdentityCard({ profile, subtitle }) {
  const roleLabel = ROLE_LABELS[profile?.role] || 'User';
  const userName = String(profile?.name || 'User').trim() || 'User';

  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <Text style={styles.appName}>Limkokwing Reports</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.roleText}>{roleLabel}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.logoWrap}>
        <Image
          source={require('../../../assets/images/limkokwing logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundWhite,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadows.card,
  },
  textBlock: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.darkText,
  },
  userName: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: colors.darkText,
  },
  roleText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryGoldDark,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondaryText,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundWhite,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
