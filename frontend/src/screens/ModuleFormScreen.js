import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import OptionSelector from '../components/OptionSelector';
import { FACULTIES, STREAMS, getModuleDefinition } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { createModuleRecord, getModuleRecords, updateModuleRecord } from '../services/api';
import { loadLecturers, loadStudents } from '../services/users';
import { colors, radius, shadows, spacing } from '../styles/theme';

function buildInitialForm(definition, record, profile) {
  return (definition?.fields || []).reduce((result, field) => {
    if (record?.[field.key] !== undefined && record?.[field.key] !== null) {
      result[field.key] = String(record[field.key]);
      return result;
    }

    if (field.key === 'facultyName') {
      result[field.key] = profile?.facultyName || field.options?.[0] || '';
      return result;
    }

    if (field.key === 'stream') {
      result[field.key] = profile?.streamName || field.options?.[0] || '';
      return result;
    }

    if (field.key === 'studentName') {
      result[field.key] = profile?.role === 'student' ? profile?.name || '' : '';
      return result;
    }

    if (field.key === 'studentEmail') {
      result[field.key] = profile?.role === 'student' ? profile?.email || '' : '';
      return result;
    }

    if (field.key === 'studentId') {
      result[field.key] = profile?.role === 'student' ? profile?.studentId || '' : '';
      return result;
    }

    if (field.key === 'targetRole') {
      result[field.key] = profile?.role === 'student' ? 'Lecturer' : field.options?.[0] || '';
      return result;
    }

    if (field.type === 'select') {
      result[field.key] = field.options?.[0] || '';
      return result;
    }

    result[field.key] = '';
    return result;
  }, {});
}

function validateForm(definition, form) {
  const errors = {};

  (definition?.fields || []).forEach((field) => {
    if (!String(form[field.key] ?? '').trim()) {
      errors[field.key] = 'Required';
    }
  });

  if (definition?.title === 'Rating') {
    const score = Number(form.ratingScore);
    if (Number.isNaN(score) || score < 1 || score > 5) {
      errors.ratingScore = 'Select 1 to 5';
    }
  }

  return errors;
}

export default function ModuleFormScreen({ navigation, route }) {
  const { profile } = useAuth();
  const { moduleKey, moduleLabel, record } = route.params;
  const definition = getModuleDefinition(moduleKey);
  const isEditing = Boolean(record);
  const [form, setForm] = useState(() => buildInitialForm(definition, record, profile));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [referenceData, setReferenceData] = useState({
    lecturers: [],
    students: [],
    courses: [],
    classes: [],
    lectures: [],
  });

  useEffect(() => {
    let active = true;

    async function loadReferences() {
      try {
        const requests = [];

        if (moduleKey === 'ratings' || moduleKey === 'courses') {
          requests.push(loadLecturers(profile).then((lecturers) => ({ key: 'lecturers', value: lecturers })));
        }

        if (moduleKey === 'attendance') {
          if (profile?.role === 'lecturer') {
            requests.push(loadStudents(profile).then((students) => ({ key: 'students', value: students })));
            requests.push(getModuleRecords('lectures').then((response) => ({ key: 'lectures', value: response.records || [] })));
          } else {
            requests.push(getModuleRecords('classes').then((response) => ({ key: 'classes', value: response.records || [] })));
            requests.push(getModuleRecords('courses').then((response) => ({ key: 'courses', value: response.records || [] })));
          }
        }

        const results = await Promise.all(requests);

        if (!active) {
          return;
        }

        setReferenceData((current) =>
          results.reduce((next, item) => ({ ...next, [item.key]: item.value }), current)
        );
      } catch (error) {
        if (active) {
          setReferenceData({
            lecturers: [],
            students: [],
            courses: [],
            classes: [],
            lectures: [],
          });
        }
      }
    }

    loadReferences();

    return () => {
      active = false;
    };
  }, [moduleKey, profile]);

  const title = useMemo(() => {
    const resolvedTitle = moduleLabel || definition?.title || 'Record';
    return `${isEditing ? 'Edit' : 'Add'} ${resolvedTitle}`;
  }, [definition?.title, isEditing, moduleLabel]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const lecturerOptions = useMemo(
    () => referenceData.lecturers.map((lecturer) => lecturer.name),
    [referenceData.lecturers]
  );
  const studentOptions = useMemo(
    () => referenceData.students.map((student) => student.name),
    [referenceData.students]
  );
  const lecturerCourseOptions = useMemo(
    () => referenceData.lectures.map((lecture) => `${lecture.courseCode} - ${lecture.className}`),
    [referenceData.lectures]
  );
  const studentCourseOptions = useMemo(() => {
    const source = referenceData.classes.length ? referenceData.classes : referenceData.courses;
    return source.map((entry) => `${entry.courseCode} - ${entry.className}`);
  }, [referenceData.classes, referenceData.courses]);

  const applyLecturerSelection = (name) => {
    const lecturer = referenceData.lecturers.find((entry) => entry.name === name);
    updateField('targetName', name);
    updateField('targetRole', 'Lecturer');
    updateField('targetEmail', lecturer?.email || '');
    updateField('targetStream', lecturer?.streamName || profile?.streamName || STREAMS[0]);
  };

  const applyCourseLecturerSelection = (name) => {
    const lecturer = referenceData.lecturers.find((entry) => entry.name === name);
    updateField('assignedLecturerName', name);
    updateField('assignedLecturerEmail', lecturer?.email || '');
    updateField('stream', lecturer?.streamName || form.stream || profile?.streamName || STREAMS[0]);
  };

  const applyStudentSelection = (name) => {
    const student = referenceData.students.find((entry) => entry.name === name);
    updateField('studentName', name);
    updateField('studentEmail', student?.email || '');
    updateField('studentId', student?.studentId || '');
    updateField('stream', student?.streamName || profile?.streamName || form.stream || STREAMS[0]);
  };

  const applyAttendanceCourseSelection = (value) => {
    const source = profile?.role === 'lecturer' ? referenceData.lectures : (referenceData.classes.length ? referenceData.classes : referenceData.courses);
    const [courseCode] = value.split(' - ');
    const selected = source.find((entry) => entry.courseCode === courseCode);

    if (!selected) {
      return;
    }

    updateField('courseCode', selected.courseCode || '');
    updateField('className', selected.className || '');
    updateField('stream', selected.stream || form.stream || profile?.streamName || STREAMS[0]);
  };

  const handleSubmit = async () => {
    if (!definition) {
      Alert.alert('Unavailable', 'This screen is not available.');
      return;
    }

    const validationErrors = validateForm(definition, form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      Alert.alert('Check form', 'Please complete all required fields.');
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await updateModuleRecord(moduleKey, record.id, form);
      } else {
        await createModuleRecord(moduleKey, form);
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAttendanceForm = () => (
    <>
      <OptionSelector label="Faculty" options={FACULTIES} value={form.facultyName} onChange={(value) => updateField('facultyName', value)} error={errors.facultyName} />
      <OptionSelector label="Stream" options={STREAMS} value={form.stream} onChange={(value) => updateField('stream', value)} error={errors.stream} />
      {profile?.role === 'lecturer' && studentOptions.length ? (
        <OptionSelector label="Student" options={studentOptions} value={form.studentName} onChange={applyStudentSelection} error={errors.studentName} />
      ) : null}
      {profile?.role === 'student' && studentCourseOptions.length ? (
        <OptionSelector label="Class" options={studentCourseOptions} value={form.courseCode && form.className ? `${form.courseCode} - ${form.className}` : ''} onChange={applyAttendanceCourseSelection} />
      ) : null}
      {profile?.role === 'lecturer' && lecturerCourseOptions.length ? (
        <OptionSelector label="Class" options={lecturerCourseOptions} value={form.courseCode && form.className ? `${form.courseCode} - ${form.className}` : ''} onChange={applyAttendanceCourseSelection} />
      ) : null}
      <InputField label="Class Name" value={form.className} onChangeText={(value) => updateField('className', value)} editable={profile?.role !== 'student' && profile?.role !== 'lecturer'} error={errors.className} />
      <InputField label="Course Code" value={form.courseCode} onChangeText={(value) => updateField('courseCode', value)} editable={profile?.role !== 'student' && profile?.role !== 'lecturer'} autoCapitalize="characters" error={errors.courseCode} />
      <InputField label="Attendance Date" value={form.attendanceDate} onChangeText={(value) => updateField('attendanceDate', value)} placeholder="2026-05-09" error={errors.attendanceDate} />
      <InputField label="Student Name" value={form.studentName} onChangeText={(value) => updateField('studentName', value)} editable={profile?.role !== 'student' && profile?.role !== 'lecturer'} error={errors.studentName} />
      <InputField label="Student Email" value={form.studentEmail} onChangeText={(value) => updateField('studentEmail', value)} editable={profile?.role !== 'student' && profile?.role !== 'lecturer'} autoCapitalize="none" error={errors.studentEmail} />
      <InputField label="Student ID" value={form.studentId} onChangeText={(value) => updateField('studentId', value)} editable={profile?.role !== 'student' && profile?.role !== 'lecturer'} error={errors.studentId} />
      <OptionSelector label="Status" options={['Present', 'Late', 'Absent']} value={form.attendanceStatus} onChange={(value) => updateField('attendanceStatus', value)} error={errors.attendanceStatus} />
    </>
  );

  const renderRatingForm = () => (
    <>
      <OptionSelector label="Faculty" options={FACULTIES} value={form.facultyName} onChange={(value) => updateField('facultyName', value)} error={errors.facultyName} />
      {lecturerOptions.length ? (
        <OptionSelector label="Lecturer" options={lecturerOptions} value={form.targetName} onChange={applyLecturerSelection} error={errors.targetName} />
      ) : (
        <InputField label="Lecturer" value={form.targetName} onChangeText={(value) => updateField('targetName', value)} error={errors.targetName} />
      )}
      <InputField label="Lecturer Email" value={form.targetEmail} onChangeText={(value) => updateField('targetEmail', value)} editable={false} error={errors.targetEmail} />
      <InputField label="Course Code" value={form.courseCode} onChangeText={(value) => updateField('courseCode', value)} autoCapitalize="characters" error={errors.courseCode} />
      <OptionSelector label="Rating" options={['1', '2', '3', '4', '5']} value={form.ratingScore} onChange={(value) => updateField('ratingScore', value)} error={errors.ratingScore} />
      <InputField label="Comment" value={form.comment} onChangeText={(value) => updateField('comment', value)} multiline error={errors.comment} />
    </>
  );

  const renderCourseForm = () => (
    <>
      <OptionSelector label="Faculty" options={FACULTIES} value={form.facultyName} onChange={(value) => updateField('facultyName', value)} error={errors.facultyName} />
      <OptionSelector label="Stream" options={STREAMS} value={form.stream} onChange={(value) => updateField('stream', value)} error={errors.stream} />
      <InputField label="Course Name" value={form.courseName} onChangeText={(value) => updateField('courseName', value)} error={errors.courseName} />
      <InputField label="Course Code" value={form.courseCode} onChangeText={(value) => updateField('courseCode', value)} autoCapitalize="characters" error={errors.courseCode} />
      <InputField label="Class Name" value={form.className} onChangeText={(value) => updateField('className', value)} error={errors.className} />
      <InputField label="Semester" value={form.semester} onChangeText={(value) => updateField('semester', value)} error={errors.semester} />
      {lecturerOptions.length ? (
        <OptionSelector label="Lecturer" options={lecturerOptions} value={form.assignedLecturerName} onChange={applyCourseLecturerSelection} error={errors.assignedLecturerName} />
      ) : null}
      <InputField label="Lecturer Name" value={form.assignedLecturerName} onChangeText={(value) => updateField('assignedLecturerName', value)} editable={!lecturerOptions.length} error={errors.assignedLecturerName} />
      <InputField label="Lecturer Email" value={form.assignedLecturerEmail} onChangeText={(value) => updateField('assignedLecturerEmail', value)} editable={!lecturerOptions.length} autoCapitalize="none" error={errors.assignedLecturerEmail} />
      <InputField label="Registered Students" value={form.totalRegisteredStudents} onChangeText={(value) => updateField('totalRegisteredStudents', value)} keyboardType="numeric" error={errors.totalRegisteredStudents} />
      <InputField label="Venue" value={form.venue} onChangeText={(value) => updateField('venue', value)} error={errors.venue} />
      <InputField label="Scheduled Time" value={form.scheduledTime} onChangeText={(value) => updateField('scheduledTime', value)} placeholder="08:00 - 10:00" error={errors.scheduledTime} />
    </>
  );

  const renderGenericForm = () =>
    (definition?.fields || []).map((field) =>
      field.type === 'select' ? (
        <OptionSelector
          key={field.key}
          label={field.label}
          options={field.options}
          value={form[field.key]}
          onChange={(value) => updateField(field.key, value)}
          error={errors[field.key]}
        />
      ) : (
        <InputField
          key={field.key}
          label={field.label}
          value={String(form[field.key] ?? '')}
          onChangeText={(value) => updateField(field.key, value)}
          placeholder={field.placeholder}
          keyboardType={field.keyboardType}
          autoCapitalize={field.autoCapitalize}
          multiline={field.multiline}
          error={errors[field.key]}
        />
      )
    );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        <View style={styles.card}>
          {moduleKey === 'attendance'
            ? renderAttendanceForm()
            : moduleKey === 'ratings'
              ? renderRatingForm()
              : moduleKey === 'courses'
                ? renderCourseForm()
                : renderGenericForm()}

          <CustomButton title="Save" variant="success" onPress={handleSubmit} loading={loading} />
          <CustomButton title="Back" variant="accent" style={styles.secondaryButton} onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryGold,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  secondaryButton: {
    marginTop: 12,
  },
});
