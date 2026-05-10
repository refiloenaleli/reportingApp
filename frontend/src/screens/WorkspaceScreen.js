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
import InputField from '../components/InputField';
import InsightCard from '../components/InsightCard';
import SectionHeader from '../components/SectionHeader';
import SummaryCard from '../components/SummaryCard';
import { getModuleDefinition, hasRecordScope } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { deleteModuleRecord, getModuleRecords } from '../services/api';
import { exportRecordsToExcel } from '../services/export';
import { subscribeToModuleRecords } from '../services/realtime';
import { colors, spacing } from '../styles/theme';

function toTitleCase(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildFilterOptions(moduleKey, records) {
  if (moduleKey === 'attendance') {
    return [
      { value: 'all', label: 'All' },
      { value: 'present', label: 'Present' },
      { value: 'late', label: 'Late' },
      { value: 'absent', label: 'Absent' },
    ];
  }

  if (moduleKey === 'monitoring') {
    return [
      { value: 'all', label: 'All' },
      { value: 'open', label: 'Open' },
      { value: 'in progress', label: 'In Progress' },
      { value: 'closed', label: 'Closed' },
    ];
  }

  if (moduleKey === 'ratings') {
    return [
      { value: 'all', label: 'All' },
      { value: '5', label: '5 Stars' },
      { value: '4', label: '4 Stars' },
      { value: '3', label: '3 and Below' },
    ];
  }

  const streamOptions = [...new Set(records.map((record) => String(record.stream || '').trim()).filter(Boolean))];
  if (!streamOptions.length) {
    return [{ value: 'all', label: 'All' }];
  }

  return [{ value: 'all', label: 'All' }, ...streamOptions.slice(0, 4).map((stream) => ({ value: stream, label: stream }))];
}

function matchesFilter(moduleKey, record, filterValue) {
  if (filterValue === 'all') {
    return true;
  }

  if (moduleKey === 'attendance') {
    return String(record.attendanceStatus || '').toLowerCase() === filterValue;
  }

  if (moduleKey === 'monitoring') {
    return String(record.status || '').toLowerCase() === filterValue;
  }

  if (moduleKey === 'ratings') {
    const score = Number(record.ratingScore || 0);
    if (filterValue === '3') {
      return score <= 3;
    }
    return String(record.ratingScore || '') === filterValue;
  }

  return String(record.stream || '') === filterValue;
}

function getSummaryCards(moduleKey, records) {
  if (moduleKey === 'attendance') {
    const presentCount = records.filter((record) => String(record.attendanceStatus || '').toLowerCase() === 'present').length;
    const absentCount = records.filter((record) => String(record.attendanceStatus || '').toLowerCase() === 'absent').length;
    const attendanceRate = records.length ? Math.round((presentCount / records.length) * 100) : 0;

    return [
      { label: 'Records', value: records.length, note: 'Attendance entries captured', tone: 'info' },
      { label: 'Present Rate', value: `${attendanceRate}%`, note: `${presentCount} marked present`, tone: 'success' },
      { label: 'Absences', value: absentCount, note: 'Records needing follow-up', tone: absentCount ? 'warning' : 'accent' },
    ];
  }

  if (moduleKey === 'ratings') {
    const average = records.length
      ? (records.reduce((total, record) => total + Number(record.ratingScore || 0), 0) / records.length).toFixed(1)
      : '0.0';
    const highScores = records.filter((record) => Number(record.ratingScore || 0) >= 4).length;

    return [
      { label: 'Ratings', value: records.length, note: 'Feedback submitted', tone: 'info' },
      { label: 'Average Score', value: average, note: 'Across all visible ratings', tone: 'accent' },
      { label: 'Positive', value: highScores, note: 'Ratings at 4 or 5', tone: 'success' },
    ];
  }

  if (moduleKey === 'courses') {
    const lecturers = new Set(records.map((record) => String(record.assignedLecturerEmail || '').trim().toLowerCase()).filter(Boolean));
    const studentTotal = records.reduce((total, record) => total + Number(record.totalRegisteredStudents || 0), 0);

    return [
      { label: 'Courses', value: records.length, note: 'Teaching allocations configured', tone: 'info' },
      { label: 'Lecturers Assigned', value: lecturers.size, note: 'Teaching staff connected to courses', tone: 'accent' },
      { label: 'Registered Students', value: studentTotal, note: 'Across visible course allocations', tone: 'success' },
    ];
  }

  if (moduleKey === 'classes' || moduleKey === 'lectures') {
    const venues = new Set(records.map((record) => String(record.venue || '').trim()).filter(Boolean));
    const streams = new Set(records.map((record) => String(record.stream || '').trim()).filter(Boolean));
    return [
      { label: 'Scheduled Items', value: records.length, note: 'Teaching sessions available', tone: 'info' },
      { label: 'Streams', value: streams.size, note: 'Academic groups represented', tone: 'accent' },
      { label: 'Venues', value: venues.size, note: 'Teaching spaces in use', tone: 'success' },
    ];
  }

  const openItems = records.filter((record) => String(record.status || '').toLowerCase() !== 'closed').length;
  return [
    { label: 'Entries', value: records.length, note: 'Records visible in this workspace', tone: 'info' },
    { label: 'Open Items', value: openItems, note: 'Entries still needing follow-up', tone: openItems ? 'warning' : 'success' },
    { label: 'Latest Update', value: records[0]?.entryDate || records[0]?.attendanceDate || 'None', note: 'Most recent captured activity', tone: 'accent' },
  ];
}

function buildCardContent(moduleKey, record) {
  if (moduleKey === 'attendance') {
    return {
      title: `${record.studentName} - ${record.courseCode}`,
      subtitle: `${record.className} | ${record.attendanceDate}`,
      lines: [record.studentEmail, `Student ID: ${record.studentId}`],
      status: record.attendanceStatus,
    };
  }

  if (moduleKey === 'ratings') {
    return {
      title: record.targetName,
      subtitle: `${record.targetRole} | ${record.courseCode}`,
      lines: [`Score: ${record.ratingScore}/5`, record.comment],
      status: `${record.ratingScore} star`,
    };
  }

  if (moduleKey === 'courses') {
    return {
      title: `${record.courseCode} - ${record.courseName}`,
      subtitle: `${record.className} | ${record.stream || 'General'}`,
      lines: [
        `Lecturer: ${record.assignedLecturerName}`,
        `Schedule: ${record.scheduledTime} at ${record.venue}`,
        `Registered students: ${record.totalRegisteredStudents}`,
      ],
    };
  }

  if (moduleKey === 'classes') {
    return {
      title: `${record.className} - ${record.courseCode}`,
      subtitle: `${record.courseName} | ${record.semester}`,
      lines: [
        record.assignedLecturerName ? `Lecturer: ${record.assignedLecturerName}` : null,
        `Venue: ${record.venue}`,
        `Time: ${record.scheduledTime}`,
      ],
    };
  }

  if (moduleKey === 'lectures') {
    return {
      title: `${record.courseCode} - ${record.courseName}`,
      subtitle: `${record.className} | ${record.lecturerName}`,
      lines: [
        `Venue: ${record.venue}`,
        `Time: ${record.scheduledTime}`,
        `Registered students: ${record.totalRegisteredStudents}`,
      ],
    };
  }

  return {
    title: record.moduleName || record.className || record.courseCode || 'Record',
    subtitle: record.entryDate || record.facultyName,
    lines: [record.notes || record.venue || ''],
    status: record.status,
  };
}

export default function WorkspaceScreen({ navigation, route }) {
  const { profile } = useAuth();
  const moduleKey = route.params?.moduleKey;
  const title = route.params?.title || toTitleCase(moduleKey);
  const allowCreate = route.params?.allowCreate ?? false;
  const editScope = route.params?.editScope ?? false;
  const deleteScope = route.params?.deleteScope ?? false;
  const createLabel = route.params?.createLabel || 'Add New';
  const definition = getModuleDefinition(moduleKey);
  const [records, setRecords] = useState([]);
  const [fallbackRecords, setFallbackRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!moduleKey) {
      setError('This screen is not set up correctly.');
      setLoading(false);
      return undefined;
    }

    const unsubscribe = subscribeToModuleRecords(
      moduleKey,
      profile,
      (nextRecords) => {
        setRecords(nextRecords);
        setLoading(false);
        setError('');
      },
      (loadError) => {
        setError(loadError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [moduleKey, profile]);

  useEffect(() => {
    if (moduleKey !== 'classes') {
      setFallbackRecords([]);
      return;
    }

    if (records.length) {
      setFallbackRecords([]);
      return;
    }

    let active = true;

    async function loadCourseFallback() {
      try {
        const response = await getModuleRecords('courses');
        const nextRecords = Array.isArray(response.records)
          ? response.records.map((course) => ({
              ...course,
              id: `course-fallback-${course.id}`,
              sourceId: course.id,
            }))
          : [];

        if (active) {
          setFallbackRecords(nextRecords);
        }
      } catch (fallbackError) {
        if (active) {
          setFallbackRecords([]);
        }
      }
    }

    loadCourseFallback();

    return () => {
      active = false;
    };
  }, [moduleKey, records]);

  const displayRecords = records.length ? records : fallbackRecords;
  const filterOptions = useMemo(() => buildFilterOptions(moduleKey, displayRecords), [displayRecords, moduleKey]);

  const visibleRecords = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return displayRecords.filter((record) => {
      if (!matchesFilter(moduleKey, record, activeFilter)) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const haystack = Object.values(record)
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');

      return haystack.includes(searchValue);
    });
  }, [activeFilter, displayRecords, moduleKey, search]);

  const summaryCards = useMemo(() => getSummaryCards(moduleKey, visibleRecords), [moduleKey, visibleRecords]);

  const handleDelete = (recordId) => {
    Alert.alert('Delete entry', 'This item will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteModuleRecord(moduleKey, recordId);
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
        moduleKey,
        (definition?.fields || []).map((field) => ({ key: field.key, label: field.label })),
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
      <Text style={styles.title}>{title}</Text>

      <SectionHeader title="Overview" />
      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </View>

      <View style={styles.actionRow}>
        {allowCreate ? (
          <CustomButton
            title={createLabel}
            style={styles.actionButton}
            onPress={() => navigation.navigate('ModuleForm', { moduleKey, moduleLabel: title })}
          />
        ) : null}
        <CustomButton title="Export Excel" variant="accent" style={styles.actionButton} onPress={handleExport} />
      </View>

      <InputField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${title.toLowerCase()}`}
        autoCapitalize="none"
      />

      <FilterChips options={filterOptions} value={activeFilter} onChange={setActiveFilter} />

      {loading && !displayRecords.length ? <Text style={styles.infoText}>Loading records...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <SectionHeader title="Records" />
      {!loading && !visibleRecords.length && !error ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          message=""
        />
      ) : null}

      {visibleRecords.map((record) => {
        const card = buildCardContent(moduleKey, record);
        const canEdit = !String(record.id || '').startsWith('course-fallback-') && hasRecordScope(editScope, record, profile);
        const canDelete = !String(record.id || '').startsWith('course-fallback-') && hasRecordScope(deleteScope, record, profile);

        return (
          <View key={record.id}>
            <InsightCard title={card.title} subtitle={card.subtitle} lines={card.lines} status={card.status} />
            {canEdit || canDelete ? (
              <View style={styles.cardActions}>
                {canEdit ? (
                  <CustomButton
                    title="Edit"
                    variant="info"
                    style={styles.cardAction}
                    onPress={() => navigation.navigate('ModuleForm', { moduleKey, moduleLabel: title, record })}
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
