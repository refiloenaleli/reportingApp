import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { subscribeToReports } from '../services/realtime';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function FeedbackListScreen() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToReports(
      profile,
      (nextReports) => {
        setReports(nextReports.filter((report) => String(report.prlFeedback || '').trim()));
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

  const visibleReports = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    if (!searchValue) {
      return reports;
    }

    return reports.filter((report) =>
      [
        report.courseCode,
        report.courseName,
        report.className,
        report.lecturerName,
        report.prlFeedback,
        report.status,
      ].some((value) => String(value ?? '').toLowerCase().includes(searchValue))
    );
  }, [reports, search]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <Text style={styles.title}>Feedback List</Text>
      <InputField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search feedback"
        autoCapitalize="none"
      />

      {loading && !reports.length ? <Text style={styles.infoText}>Loading...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !visibleReports.length && !error ? <Text style={styles.infoText}>No feedback found.</Text> : null}

      {visibleReports.map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.cardTitle}>{report.courseCode} - {report.courseName}</Text>
          <Text style={styles.meta}>{report.className} | {report.lecturerName}</Text>
          <Text style={styles.feedback}>{report.prlFeedback}</Text>
          <Text style={styles.status}>Status: {report.status}</Text>
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
  meta: {
    marginTop: 6,
    color: colors.primaryGold,
    fontSize: 12,
    fontWeight: '600',
  },
  feedback: {
    marginTop: 10,
    color: colors.accentPurple,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  status: {
    marginTop: 8,
    color: colors.infoBlue,
    fontSize: 13,
    fontWeight: '700',
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
