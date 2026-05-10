import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import EmptyState from '../components/EmptyState';
import FilterChips from '../components/FilterChips';
import InsightCard from '../components/InsightCard';
import InputField from '../components/InputField';
import SectionHeader from '../components/SectionHeader';
import SummaryCard from '../components/SummaryCard';
import { useAuth } from '../context/AuthContext';
import { getModuleRecords } from '../services/api';
import { loadLecturers } from '../services/users';
import { colors, spacing } from '../styles/theme';

export default function LecturerDirectoryScreen({ navigation }) {
  const { profile } = useAuth();
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, courseResponse] = await Promise.all([
        loadLecturers(profile),
        getModuleRecords('courses').catch(() => ({ records: [] })),
      ]);
      setLecturers(users);
      setCourses(Array.isArray(courseResponse.records) ? courseResponse.records : []);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.role]);

  const streamOptions = useMemo(() => {
    const streams = [...new Set(lecturers.map((lecturer) => String(lecturer.streamName || '').trim()).filter(Boolean))];
    return [{ value: 'all', label: 'All' }, ...streams.slice(0, 5).map((stream) => ({ value: stream, label: stream }))];
  }, [lecturers]);

  const assignmentsByEmail = useMemo(() => {
    return courses.reduce((result, course) => {
      const key = String(course.assignedLecturerEmail || '').trim().toLowerCase();
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }, [courses]);

  const visibleLecturers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return lecturers.filter((lecturer) => {
      if (activeFilter !== 'all' && lecturer.streamName !== activeFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [lecturer.name, lecturer.email, lecturer.streamName]
        .some((value) => String(value || '').toLowerCase().includes(searchValue));
    });
  }, [activeFilter, lecturers, search]);

  const summaryCards = useMemo(() => {
    const assignedLecturers = visibleLecturers.filter(
      (lecturer) => assignmentsByEmail[String(lecturer.email || '').trim().toLowerCase()]
    ).length;
    const totalAssignments = visibleLecturers.reduce(
      (total, lecturer) => total + (assignmentsByEmail[String(lecturer.email || '').trim().toLowerCase()] || 0),
      0
    );

    return [
      { label: 'Lecturers', value: visibleLecturers.length, note: 'Active lecturer accounts in view', tone: 'info' },
      { label: 'Assigned Lecturers', value: assignedLecturers, note: 'Lecturers already linked to courses', tone: 'accent' },
      { label: 'Course Allocations', value: totalAssignments, note: 'Courses distributed across visible staff', tone: 'success' },
    ];
  }, [assignmentsByEmail, visibleLecturers]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <Text style={styles.title}>Lecturer Management</Text>

      <SectionHeader title="Overview" />
      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </View>

      {profile?.role === 'pl' ? (
        <CustomButton
          title="Create Lecturer"
          style={styles.createButton}
          onPress={() => navigation.navigate('LecturerForm')}
        />
      ) : null}

      <InputField
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search lecturers"
        autoCapitalize="none"
      />

      <FilterChips options={streamOptions} value={activeFilter} onChange={setActiveFilter} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!loading && !visibleLecturers.length && !error ? (
        <EmptyState
          title="No lecturers found"
          message=""
        />
      ) : null}

      {visibleLecturers.map((lecturer) => {
        const emailKey = String(lecturer.email || '').trim().toLowerCase();
        const assignmentCount = assignmentsByEmail[emailKey] || 0;

        return (
          <InsightCard
            key={lecturer.uid}
            title={lecturer.name}
            subtitle={lecturer.email}
            lines={[
              lecturer.streamName ? `Stream: ${lecturer.streamName}` : 'No stream assigned yet',
              `Course assignments: ${assignmentCount}`,
              `Faculty: ${lecturer.facultyName}`,
            ]}
            status={assignmentCount ? 'assigned' : 'unassigned'}
          />
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
  createButton: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.dangerRed,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
});
