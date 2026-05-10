import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import EmptyState from '../components/EmptyState';
import SectionHeader from '../components/SectionHeader';
import { useAuth } from '../context/AuthContext';
import { markNotificationRead } from '../services/api';
import { subscribeToNotifications } from '../services/realtime';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      profile,
      (nextNotifications) => {
        setNotifications(nextNotifications);
        setError('');
        setLoading(false);
      },
      (loadError) => {
        setError(loadError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile]);

  const handleRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
    } catch (readError) {
      setError(readError.message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <Text style={styles.title}>Notifications</Text>
      <SectionHeader title="Inbox" />

      {loading && !notifications.length ? <Text style={styles.infoText}>Loading...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !notifications.length && !error ? <EmptyState title="No notifications" message="" /> : null}

      {notifications.map((notification) => (
        <View key={notification.id} style={styles.card}>
          <Text style={styles.cardTitle}>{notification.title}</Text>
          <Text style={styles.body}>{notification.body}</Text>
          {!notification.isRead && notification.audience !== 'all' ? (
            <CustomButton
              title="Mark as Read"
              variant="accent"
              style={styles.readButton}
              onPress={() => handleRead(notification.id)}
            />
          ) : notification.audience === 'all' ? (
            <Text style={styles.readText}>Everyone</Text>
          ) : (
            <Text style={styles.readText}>Read</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryGold,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkText,
  },
  body: {
    marginTop: 8,
    color: colors.darkText,
    fontSize: 14,
    lineHeight: 20,
  },
  readButton: {
    marginTop: 12,
  },
  readText: {
    marginTop: 12,
    color: colors.successGreen,
    fontWeight: '700',
    fontSize: 13,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  errorText: {
    color: colors.dangerRed,
    fontSize: 14,
    marginBottom: 12,
  },
});
