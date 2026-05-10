import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomButton from '../components/CustomButton';
import EmptyState from '../components/EmptyState';
import FilterChips from '../components/FilterChips';
import InsightCard from '../components/InsightCard';
import InputField from '../components/InputField';
import SectionHeader from '../components/SectionHeader';
import SummaryCard from '../components/SummaryCard';
import { useAuth } from '../context/AuthContext';
import { deleteReport } from '../services/api';
import { exportRecordsToExcel } from '../services/export';
import { subscribeToReports } from '../services/realtime';
import { colors, spacing } from '../styles/theme';

function normalizeStatus(report) {
  const status = String(report.status || '').trim().toLowerCase();

  if (status === 'reviewed') {
    return 'reviewed';
  }

  if (status === 'approved' || status === 'resolved') {
    return 'approved';
  }

  return 'pending';
}

function getStatusLabel(report) {
  const status = normalizeStatus(report);
  if (status === 'approved') {
    return 'Approved';
  }
  if (status === 'reviewed') {
    return 'Reviewed';
  }
  return 'Pending';
}

export default function ReportsListScreen({ navigation, route }) {
  const { profile } = useAuth();
  const title = route.params?.title || (profile?.role === 'prl' ? 'Review Queue' : 'Reports');
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToReports(
      profile,
      (nextReports) => {
        setReports(nextReports);
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
    const roleFilteredReports =
      profile?.role === 'pl'
        ? reports.filter((report) => String(report.prlFeedback || '').trim())
        : reports;
    const searchValue = search.trim().toLowerCase();

    return roleFilteredReports.filter((report) => {
      if (activeFilter !== 'all' && normalizeStatus(report) !== activeFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [
        report.facultyName,
        report.stream,
        report.className,
        report.courseName,
        report.courseCode,
        report.lecturerName,
        report.topicTaught,
        report.weekOfReporting,
        report.prlFeedback,
      ].some((value) => String(value ?? '').toLowerCase().includes(searchValue));
    });
  }, [activeFilter, profile?.role, reports, search]);

  const summaryCards = useMemo(() => {
    const pendingCount = visibleReports.filter((report) => normalizeStatus(report) === 'pending').length;
    const reviewedCount = visibleReports.filter((report) => normalizeStatus(report) === 'reviewed').length;
    const attendanceAverage = visibleReports.length
      ? Math.round(
          visibleReports.reduce((total, report) => {
            const present = Number(report.actualStudentsPresent || 0);
            const registered = Number(report.totalRegisteredStudents || 0);
            return total + (registered ? (present / registered) * 100 : 0);
          }, 0) / visibleReports.length
        )
      : 0;

    return [
      { label: 'Reports', value: visibleReports.length, note: 'Visible in the current view', tone: 'info' },
      { label: 'Pending', value: pendingCount, note: 'Still waiting for the next action', tone: pendingCount ? 'warning' : 'success' },
      { label: 'Attendance Avg', value: `${attendanceAverage}%`, note: 'Average attendance across visible reports', tone: 'accent' },
      { label: 'Reviewed', value: reviewedCount, note: 'Already checked with feedback', tone: 'success' },
    ];
  }, [visibleReports]);

  const handleDelete = (reportId) => {
    Alert.alert('Delete report', 'This report will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(reportId);
          } catch (deleteError) {
            Alert.alert('Delete failed', deleteError.message);
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    try {
      const fileUri = await exportRecordsToExcel(
        'lecturer-reports',
        [
          { key: 'facultyName', label: 'Faculty Name' },
          { key: 'stream', label: 'Stream' },
          { key: 'className', label: 'Class Name' },
          { key: 'weekOfReporting', label: 'Week of Reporting' },
          { key: 'dateOfLecture', label: 'Date of Lecture' },
          { key: 'courseName', label: 'Course Name' },
          { key: 'courseCode', label: 'Course Code' },
          { key: 'lecturerName', label: "Lecturer's Name" },
          { key: 'actualStudentsPresent', label: 'Actual Students Present' },
          { key: 'totalRegisteredStudents', label: 'Total Registered Students' },
          { key: 'venue', label: 'Venue' },
          { key: 'scheduledLectureTime', label: 'Scheduled Lecture Time' },
          { key: 'topicTaught', label: 'Topic Taught' },
          { key: 'learningOutcomes', label: 'Learning Outcomes' },
          { key: 'lecturerRecommendations', label: "Lecturer's Recommendations" },
          { key: 'prlFeedback', label: 'PRL Feedback' },
          { key: 'status', label: 'Status' },
        ],
        visibleReports
      );
      Alert.alert('Export saved', fileUri);
    } catch (exportError) {
      Alert.alert('Export failed', exportError.message);
    }
  };

  const canCreate = profile?.role === 'lecturer';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <Text style={styles.title}>{title}</Text>

      <SectionHeader title="Overview" />
      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </View>

      <View style={styles.actionRow}>
        {canCreate ? (
          <CustomButton title="Create Report" style={styles.actionButton} onPress={() => navigation.navigate('ReportForm')} />
        ) : null}
        <CustomButton title="Export Excel" variant="accent" style={styles.actionButton} onPress={handleExport} />
      </View>

      <InputField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by course, lecturer, week, topic, or feedback"
        autoCapitalize="none"
      />

      <FilterChips
        options={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'reviewed', label: 'Reviewed' },
          { value: 'approved', label: 'Approved' },
        ]}
        value={activeFilter}
        onChange={setActiveFilter}
      />

      <SectionHeader title="Report History" />
      {loading && !reports.length ? <Text style={styles.infoText}>Loading reports...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !visibleReports.length && !error ? (
        <EmptyState
          title="No reports available"
          message=""
        />
      ) : null}

      {visibleReports.map((report) => {
        const canEdit =
          (profile?.role === 'lecturer' && report.createdBy === profile?.uid) ||
          profile?.role === 'prl';
        const canDelete = profile?.role === 'lecturer' && report.createdBy === profile?.uid;
        const attendanceText = `${report.actualStudentsPresent}/${report.totalRegisteredStudents} attended`;

        return (
          <View key={report.id}>
            <InsightCard
              title={`${report.courseCode} - ${report.courseName}`}
              subtitle={`${report.className} | Week ${report.weekOfReporting} | ${report.dateOfLecture}`}
              lines={[
                `Lecturer: ${report.lecturerName}`,
                `Attendance: ${attendanceText}`,
                `Topic: ${report.topicTaught}`,
                report.prlFeedback ? `Feedback: ${report.prlFeedback}` : 'Awaiting reviewer feedback',
              ]}
              status={getStatusLabel(report)}
              actionLabel={profile?.role === 'prl' ? 'Open review' : 'Open report'}
              onPress={() => navigation.navigate('ReportForm', { report })}
            />

            {canEdit || canDelete ? (
              <View style={styles.cardActions}>
                {canEdit ? (
                  <CustomButton
                    title={profile?.role === 'prl' ? 'Review' : 'Edit'}
                    variant={profile?.role === 'prl' ? 'accent' : 'info'}
                    style={styles.cardAction}
                    onPress={() => navigation.navigate('ReportForm', { report })}
                  />
                ) : null}
                {canDelete ? (
                  <CustomButton
                    title="Delete"
                    variant="danger"
                    style={styles.cardAction}
                    onPress={() => handleDelete(report.id)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkText,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
    marginTop: -2,
  },
  cardAction: {
    flex: 1,
  },
  infoText: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  errorText: {
    color: colors.dangerRed,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});
