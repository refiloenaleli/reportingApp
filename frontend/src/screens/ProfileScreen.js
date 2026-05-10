import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIdentityCard from '../components/AppIdentityCard';
import CustomButton from '../components/CustomButton';
import EmptyState from '../components/EmptyState';
import InsightCard from '../components/InsightCard';
import SectionHeader from '../components/SectionHeader';
import SummaryCard from '../components/SummaryCard';
import { ROLE_LABELS } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { getModuleRecords } from '../services/api';
import { colors, spacing } from '../styles/theme';

export default function ProfileScreen() {
  const { profile, logout, refreshProfile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setRefreshing(true);
        const [coursesResponse, lecturesResponse] = await Promise.all([
          getModuleRecords('courses').catch(() => ({ records: [] })),
          getModuleRecords('lectures').catch(() => ({ records: [] })),
          refreshProfile().catch(() => profile),
        ]);

        if (!active) {
          return;
        }

        setCourses(Array.isArray(coursesResponse.records) ? coursesResponse.records : []);
        setLectures(Array.isArray(lecturesResponse.records) ? lecturesResponse.records : []);
        setError('');
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setRefreshing(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [profile?.role, profile?.uid, refreshProfile]);

  const studentCourses = useMemo(() => {
    if (profile?.role !== 'student') {
      return [];
    }
    return courses.slice(0, 4);
  }, [courses, profile?.role]);

  const lecturerAssignments = useMemo(() => {
    if (profile?.role !== 'lecturer') {
      return [];
    }
    return lectures.slice(0, 4);
  }, [lectures, profile?.role]);

  const summaryCards = useMemo(() => {
    if (profile?.role === 'student') {
      return [
        { label: 'Student ID', value: profile?.studentId || '-', note: 'Registered ID', tone: 'info' },
        { label: 'Stream', value: profile?.streamName || '-', note: 'Academic stream', tone: 'accent' },
        { label: 'Courses', value: studentCourses.length, note: 'Visible course allocations', tone: 'success' },
      ];
    }

    if (profile?.role === 'lecturer') {
      return [
        { label: 'Stream', value: profile?.streamName || '-', note: 'Teaching stream', tone: 'info' },
        { label: 'Classes', value: lecturerAssignments.length, note: 'Assigned teaching slots', tone: 'accent' },
        { label: 'Faculty', value: profile?.facultyName || '-', note: 'Registered faculty', tone: 'success' },
      ];
    }

    return [
      { label: 'Role', value: ROLE_LABELS[profile?.role] || '-', note: 'Account role', tone: 'info' },
      { label: 'Stream', value: profile?.streamName || '-', note: 'Assigned stream', tone: 'accent' },
      { label: 'Faculty', value: profile?.facultyName || '-', note: 'Registered faculty', tone: 'success' },
    ];
  }, [lecturerAssignments.length, profile?.facultyName, profile?.role, profile?.streamName, profile?.studentId, studentCourses.length]);

  const accountDetails = useMemo(
    () => [
      { title: 'Full Name', value: profile?.name || '-' },
      { title: 'Role', value: ROLE_LABELS[profile?.role] || '-' },
      { title: 'Email', value: profile?.email || '-' },
      { title: 'Faculty', value: profile?.facultyName || '-' },
      { title: 'Stream', value: profile?.streamName || '-' },
      ...(profile?.role === 'student' ? [{ title: 'Student ID', value: profile?.studentId || '-' }] : []),
    ],
    [profile?.email, profile?.facultyName, profile?.name, profile?.role, profile?.streamName, profile?.studentId]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile(),
        getModuleRecords('courses').then((response) => {
          setCourses(Array.isArray(response.records) ? response.records : []);
        }).catch(() => setCourses([])),
        getModuleRecords('lectures').then((response) => {
          setLectures(Array.isArray(response.records) ? response.records : []);
        }).catch(() => setLectures([])),
      ]);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <AppIdentityCard profile={profile} subtitle="Your account details and assigned work." />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />
        ))}
      </View>

      <SectionHeader title="Account Information" />
      {accountDetails.map((item) => (
        <InsightCard
          key={item.title}
          title={item.title}
          subtitle={item.value}
        />
      ))}

      {profile?.role === 'student' ? (
        <>
          <SectionHeader title="Course Details" />
          {studentCourses.length ? studentCourses.map((course) => (
            <InsightCard
              key={course.id}
              title={`${course.courseCode} - ${course.courseName}`}
              subtitle={course.className}
              lines={[`Lecturer: ${course.assignedLecturerName}`, `Stream: ${course.stream}`]}
            />
          )) : (
            <EmptyState title="No courses" message="" />
          )}
        </>
      ) : null}

      {profile?.role === 'lecturer' ? (
        <>
          <SectionHeader title="Assigned Classes" />
          {lecturerAssignments.length ? lecturerAssignments.map((lecture) => (
            <InsightCard
              key={lecture.id}
              title={`${lecture.courseCode} - ${lecture.courseName}`}
              subtitle={lecture.className}
              lines={[`Venue: ${lecture.venue}`, `Time: ${lecture.scheduledTime}`]}
            />
          )) : (
            <EmptyState title="No classes" message="" />
          )}
        </>
      ) : null}

      <CustomButton title="Logout" variant="danger" style={styles.logoutButton} onPress={logout} />
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
  logoutButton: {
    marginTop: spacing.lg,
  },
});
