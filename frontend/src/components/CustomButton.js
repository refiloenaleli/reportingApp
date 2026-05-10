import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}) {
  const isSecondary = variant === 'secondary' || variant === 'accent';
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';
  const isInfo = variant === 'info';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.button,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        isSuccess && styles.successButton,
        isInfo && styles.infoButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.backgroundWhite} />
      ) : (
        <Text
          style={[
            styles.text,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primaryGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: colors.accentPurple,
  },
  dangerButton: {
    backgroundColor: colors.dangerRed,
  },
  successButton: {
    backgroundColor: colors.successGreen,
  },
  infoButton: {
    backgroundColor: colors.infoBlue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    color: colors.backgroundWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});
