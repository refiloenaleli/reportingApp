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
import { hasRecordScope } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { deleteModuleRecord } from '../services/api';
import { exportRecordsToExcel } from '../services/export';
import { subscribeToModuleRecords, subscribeToReports } from '../services/realtime';
import { colors, spacing } from '../styles/theme';

function getAttendanceRate(report) {
  const present = Number(report.actualStudentsPresent || 0);
  const total = Number(report.totalRegisteredStudents || 0);
  if (!total) {
    return 0;
  }

  return Math.round((present / total) * 100);
}

export default function MonitoringScreen({ navigation }) {
  const { profile } = useAuth();
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribers = [
      subscribeToModuleRecords(
        'monitoring',
        profile,
        (records) => {
          setMonitoringRecords(records);
          setLoading(false);
          setError('');
        },
        (loadError) => {
          setError(loadError.message);
          setLoading(false);
        }
      ),
      subscribeToModuleRecords(
        'attendance',
        profile,
        (records) => setAttendanceRecords(records),
        () => {}
      ),
      subscribeToModuleRecords(
        'ratings',
        profile,
        (records) => setRatings(records),
        () => {}
      ),
      subscribeToReports(
        profile,
        (nextReports) => setReports(nextReports),
        () => {}
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    };
  }, [profile]);

  const alerts = useMemo(() => {
    const lowAttendanceReports = reports
      .filter((report) => getAttendanceRate(report) > 0 && getAttendanceRate(report) < 60)
      .map((report) => ({
        id: `report-${report.id}`,
        title: `Low attendance in ${report.courseCode}`,
        subtitle: `${getAttendanceRate(report)}% attendance recorded for ${report.className}`,
        lines: [report.topicTaught, `Lecturer: ${report.lecturerName}`],
        status: 'warning',
      }));

    const pendingReports = reports
      .filter((report) => !String(report.prlFeedback || '').trim())
      .slice(0, 4)
      .map((report) => ({
        id: `pending-${report.id}`,
        title: `Pending report review`,
        subtitle: `${report.courseCode} | Week ${report.weekOfReporting}`,
        lines: [report.lecturerName, report.dateOfLecture],
        status: 'pending',
      }));

    const absenceCount = attendanceRecords.filter(
      (record) => String(record.attendanceStatus || '').toLowerCase() === 'absent'
    ).length;

    const attendanceAlert = absenceCount
      ? [
          {
            id: 'attendance-absences',
            title: 'Absence trend detected',
            subtitle: `${absenceCount} absence records are visible in the current view`,
            lines: [],
            status: 'warning',
          },
        ]
      : [];

    return [...lowAttendanceReports, ...pendingReports, ...attendanceAlert].slice(0, 6);
  }, [attendanceRecords, reports]);

  const visibleRecords = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return monitoringRecords.filter((record) => {
      const status = String(record.status || '').toLowerCase();
      if (activeFilter !== 'all' && status !== activeFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [record.moduleName, record.notes, record.status, record.entryDate]
        .some((value) => String(value || '').toLowerCase().includes(searchValue));
    });
  }, [activeFilter, monitoringRecords, search]);

  const summaryCards = useMemo(() => {
    const openItems = monitoringRecords.filter((record) => String(record.status || '').toLowerCase() !== 'closed').length;
    const lowAttendanceAlerts = reports.filter((report) => getAttendanceRate(report) > 0 && getAttendanceRate(report) < 60).length;
    const pendingFeedback = reports.filter((report) => !String(report.prlFeedback || '').trim()).length;

    return [
      { label: 'Open Issues', value: openItems, note: 'Monitoring items still active', tone: openItems ? 'warning' : 'success' },
      { label: 'Attendance Alerts', value: lowAttendanceAlerts, note: 'Reports under the 60% threshold', tone: lowAttendanceAlerts ? 'warning' : 'accent' },
      { label: 'Pending Reports', value: pendingFeedback, note: 'Lecture reports still awaiting review', tone: pendingFeedback ? 'info' : 'success' },
    ];
  }, [monitoringRecords, reports]);

  const allowCreate = profile?.role !== 'student';
  const editScope = profile?.role === 'lecturer' ? 'own' : profile?.role === 'prl' ? 'faculty' : profile?.role === 'pl' ? 'all' : false;
  const deleteScope = profile?.role === 'lecturer' ? 'own' : profile?.role === 'pl' ? 'all' : false;

  const handleDelete = (recordId) => {
    Alert.alert('Delete issue', 'This monitoring item will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModuleRecord('monitoring', recordId);
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
        'monitoring',
        [
          { key: 'facultyName', label: 'Faculty' },
          { key: 'stream', label: 'Stream' },
          { key: 'moduleName', label: 'Issue Title' },
          { key: 'entryDate', label: 'Entry Date' },
          { key: 'status', label: 'Status' },
          { key: 'notes', label: 'Notes' },
        ],
        visibleRecords
      );
      Alert.alert('Export saved', fileUri);
    } catch (exportError) {
      Alert.alert('Export failed', exportError.message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      <Text style={styles.title}>Monitoring Overview</Text>

      <SectionHeader title="Overview" />
      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </View>

      <SectionHeader title="Alerts" />
      {!alerts.length ? (
        <EmptyState
          title="No monitoring alerts"
          message=""
        />
      ) : null}
      {alerts.map((alert) => (
        <InsightCard key={alert.id} title={alert.title} subtitle={alert.subtitle} lines={alert.lines} status={alert.status} />
      ))}

      <SectionHeader title="Monitoring Notes" />
      <View style={styles.actionRow}>
        {allowCreate ? (
          <CustomButton
            title="Add Monitoring Note"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ModuleForm', { moduleKey: 'monitoring', moduleLabel: 'Monitoring' })}
          />
        ) : null}
        <CustomButton title="Export Excel" variant="accent" style={styles.actionButton} onPress={handleExport} />
      </View>

      <InputField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search monitoring notes"
        autoCapitalize="none"
      />

      <FilterChips
        options={[
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'in progress', label: 'In Progress' },
          { value: 'closed', label: 'Closed' },
        ]}
        value={activeFilter}
        onChange={setActiveFilter}
      />

      {loading && !monitoringRecords.length ? <Text style={styles.infoText}>Loading monitoring information...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !visibleRecords.length && !error ? (
        <EmptyState
          title="No monitoring notes yet"
          message=""
        />
      ) : null}

      {visibleRecords.map((record) => {
        const canEdit = hasRecordScope(editScope, record, profile);
        const canDelete = hasRecordScope(deleteScope, record, profile);
        return (
          <View key={record.id}>
            <InsightCard
              title={record.moduleName}
              subtitle={`${record.entryDate} | ${record.facultyName}`}
              lines={[record.notes]}
              status={record.status}
            />
            {canEdit || canDelete ? (
              <View style={styles.cardActions}>
                {canEdit ? (
                  <CustomButton
                    title="Edit"
                    variant="info"
                    style={styles.cardAction}
                    onPress={() => navigation.navigate('ModuleForm', { moduleKey: 'monitoring', moduleLabel: 'Monitoring', record })}
                  />
                ) : null}
                {canDelete ? (
                  <CustomButton
                    title="Delete"
                    variant="danger"
                    style={styles.cardAction}
                    onPress={() => handleDelete(record.id)}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {profile?.role !== 'student' ? (
        <>
          <SectionHeader title="Ratings" />
          {ratings.length ? ratings.map((rating) => (
            <InsightCard
              key={rating.id}
              title={rating.targetName}
              subtitle={`${rating.courseCode} | ${rating.ratingScore}/5`}
              lines={[rating.comment]}
            />
          )) : (
            <EmptyState title="No ratings" message="" />
          )}
        </>
      ) : null}
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
  summaryRow: {
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
