import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIdentityCard from '../components/AppIdentityCard';
import EmptyState from '../components/EmptyState';
import InsightCard from '../components/InsightCard';
import SectionHeader from '../components/SectionHeader';
import SummaryCard from '../components/SummaryCard';
import { useAuth } from '../context/AuthContext';
import { loadDashboardData } from '../services/dashboard';
import { colors, spacing } from '../styles/theme';

function renderPrimaryItems(role, items, navigation) {
  if (!items.length) {
    return null;
  }

  return items.map((item) => {
    if (role === 'student') {
      return (
        <InsightCard
          key={item.id}
          title={`${item.className} - ${item.courseCode}`}
          subtitle={`${item.courseName} | ${item.semester}`}
          lines={[`Venue: ${item.venue}`, `Time: ${item.scheduledTime}`]}
        />
      );
    }

    if (role === 'lecturer') {
      return (
        <InsightCard
          key={item.id}
          title={`${item.courseCode} - ${item.courseName}`}
          subtitle={`${item.className} | ${item.scheduledTime}`}
          lines={[item.venue, `Registered students: ${item.totalRegisteredStudents}`]}
        />
      );
    }

    if (role === 'prl') {
      return (
        <InsightCard
          key={item.id}
          title={`${item.courseCode} - ${item.courseName}`}
          subtitle={`${item.lecturerName} | Week ${item.weekOfReporting}`}
          lines={[item.topicTaught, `${item.actualStudentsPresent}/${item.totalRegisteredStudents} attended`]}
          status={item.status}
          actionLabel="Open review"
          onPress={() => navigation.navigate('ReportForm', { report: item })}
        />
      );
    }

    return (
      <InsightCard
        key={item.uid || item.id}
        title={item.name || `${item.courseCode} - ${item.courseName}`}
        subtitle={item.email || item.assignedLecturerName || item.className}
        lines={[
          item.streamName ? `Stream: ${item.streamName}` : item.stream,
          item.facultyName ? `Faculty: ${item.facultyName}` : null,
        ]}
        actionLabel={item.email ? 'Open lecturer management' : undefined}
        onPress={item.email ? () => navigation.navigate('Lecturers') : undefined}
      />
    );
  });
}

function renderSecondaryItems(role, items, navigation) {
  if (!items.length) {
    return null;
  }

  return items.map((item) => {
    if (role === 'student') {
      return (
        <InsightCard
          key={item.id}
          title={item.moduleName}
          subtitle={item.entryDate}
          lines={[item.notes]}
          status={item.status}
        />
      );
    }

    if (role === 'lecturer') {
      return (
        <InsightCard
          key={item.id}
          title={`${item.courseCode} - ${item.courseName}`}
          subtitle={`${item.className} | ${item.dateOfLecture}`}
          lines={[
            `Attendance: ${item.actualStudentsPresent}/${item.totalRegisteredStudents}`,
            item.prlFeedback || item.topicTaught,
          ]}
          status={item.status}
          actionLabel="Open report"
          onPress={() => navigation.navigate('ReportForm', { report: item })}
        />
      );
    }

    if (role === 'pl') {
      return (
        <InsightCard
          key={item.id}
          title={`${item.courseCode} - ${item.courseName}`}
          subtitle={`${item.className} | ${item.dateOfLecture}`}
          lines={[
            `Attendance: ${item.actualStudentsPresent}/${item.totalRegisteredStudents}`,
            item.prlFeedback || item.topicTaught,
          ]}
          status={item.status}
          actionLabel="Open reports"
          onPress={() => navigation.navigate('Reports')}
        />
      );
    }

    if (role === 'prl') {
      return (
        <InsightCard
          key={item.id}
          title={item.moduleName}
          subtitle={item.entryDate}
          lines={[item.notes]}
          status={item.status}
        />
      );
    }

    return (
      <InsightCard
        key={item.title}
        title={item.title}
        subtitle={item.subtitle}
        status={item.status}
      />
    );
  });
}

export default function Dashboard({ navigation }) {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setRefreshing(true);
      const data = await loadDashboardData(profile);
      setDashboard(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.role]);

  const role = profile?.role || '';
  const alerts = dashboard?.alerts || [];
  const primaryItems = dashboard?.primarySection?.items || [];
  const secondaryItems = dashboard?.secondarySection?.items || [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <AppIdentityCard
        profile={profile}
        subtitle={dashboard?.heroTitle || 'Faculty operations dashboard'}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <SectionHeader title="Overview" />
      <View style={styles.summaryRow}>
        {(dashboard?.summaryCards || []).map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            note={card.note}
            tone={card.tone}
          />
        ))}
      </View>

      <SectionHeader title={dashboard?.primarySection?.title || 'Priority Work'} />
      {primaryItems.length ? (
        renderPrimaryItems(role, primaryItems, navigation)
      ) : (
        <EmptyState
          title="Nothing waiting right now"
          message=""
        />
      )}

      <SectionHeader title="Alerts" />
      {alerts.length ? (
        alerts.map((alert) => (
          <InsightCard
            key={`${alert.title}-${alert.subtitle}`}
            title={alert.title}
            subtitle={alert.subtitle}
            status={alert.status}
          />
        ))
      ) : (
        <EmptyState
          title="No alerts"
          message=""
        />
      )}

      <SectionHeader title={dashboard?.secondarySection?.title || 'Recent Activity'} />
      {secondaryItems.length ? (
        renderSecondaryItems(role, secondaryItems, navigation)
      ) : (
        <EmptyState
          title="No recent activity"
          message=""
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  errorText: {
    marginBottom: spacing.md,
    fontSize: 14,
    color: colors.dangerRed,
  },
});
