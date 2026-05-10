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
import { FACULTIES } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { createReport, getModuleRecords, updateReport } from '../services/api';
import { colors, radius, shadows, spacing } from '../styles/theme';

const statusOptions = ['pending', 'reviewed', 'approved'];

function validateForm(form, isPrl) {
  const errors = {};

  if (isPrl) {
    if (!String(form.prlFeedback ?? '').trim()) {
      errors.prlFeedback = 'Feedback is required.';
    }

    return errors;
  }

  const requiredFields = [
    'facultyName',
    'className',
    'weekOfReporting',
    'dateOfLecture',
    'courseName',
    'courseCode',
    'lecturerName',
    'actualStudentsPresent',
    'totalRegisteredStudents',
    'venue',
    'scheduledLectureTime',
    'topicTaught',
    'learningOutcomes',
    'lecturerRecommendations',
  ];

  requiredFields.forEach((field) => {
    if (!String(form[field] ?? '').trim()) {
      errors[field] = 'This field is required.';
    }
  });

  if (
    Number.isNaN(Number(form.actualStudentsPresent)) ||
    Number.isNaN(Number(form.totalRegisteredStudents))
  ) {
    errors.actualStudentsPresent = 'Enter valid numbers.';
  }

  return errors;
}

export default function ReportFormScreen({ navigation, route }) {
  const { profile } = useAuth();
  const report = route.params?.report;
  const isEditing = Boolean(report);
  const isPrl = profile?.role === 'prl';
  const isViewer = profile?.role === 'pl';
  const [assignedLectures, setAssignedLectures] = useState([]);
  const [form, setForm] = useState({
    facultyName: report?.facultyName || profile?.facultyName || FACULTIES[0],
    stream: report?.stream || '',
    className: report?.className || '',
    weekOfReporting: report?.weekOfReporting || '',
    dateOfLecture: report?.dateOfLecture || '',
    courseName: report?.courseName || '',
    courseCode: report?.courseCode || '',
    lecturerName: report?.lecturerName || profile?.name || '',
    actualStudentsPresent: String(report?.actualStudentsPresent ?? ''),
    totalRegisteredStudents: String(report?.totalRegisteredStudents ?? ''),
    venue: report?.venue || '',
    scheduledLectureTime: report?.scheduledLectureTime || '',
    topicTaught: report?.topicTaught || '',
    learningOutcomes: report?.learningOutcomes || '',
    lecturerRecommendations: report?.lecturerRecommendations || '',
    prlFeedback: report?.prlFeedback || '',
    status: report?.status || 'pending',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPrl || isViewer) {
      return;
    }

    let active = true;

    async function loadAssignedLectures() {
      try {
        const response = await getModuleRecords('lectures');
        const records = Array.isArray(response.records) ? response.records : [];

        if (!active) {
          return;
        }

        setAssignedLectures(records);
        if (!isEditing && !form.courseCode.trim() && records.length === 1) {
          const [assignedLecture] = records;
          setForm((current) => ({
            ...current,
            stream: assignedLecture.stream || current.stream,
            className: assignedLecture.className || current.className,
            courseName: assignedLecture.courseName || current.courseName,
            courseCode: assignedLecture.courseCode || current.courseCode,
            lecturerName: assignedLecture.lecturerName || current.lecturerName,
            totalRegisteredStudents:
              current.totalRegisteredStudents || String(assignedLecture.totalRegisteredStudents || ''),
            venue: assignedLecture.venue || current.venue,
            scheduledLectureTime: assignedLecture.scheduledTime || current.scheduledLectureTime,
          }));
        }
      } catch (error) {
        if (active) {
          setAssignedLectures([]);
        }
      }
    }

    loadAssignedLectures();

    return () => {
      active = false;
    };
  }, [isEditing, isPrl, isViewer]);

  useEffect(() => {
    if (isPrl || isViewer || !assignedLectures.length || !form.courseCode.trim()) {
      return;
    }

    const selectedLecture = assignedLectures.find(
      (item) => String(item.courseCode || '').toUpperCase() === form.courseCode.trim().toUpperCase()
    );

    if (!selectedLecture) {
      return;
    }

    setForm((current) => ({
      ...current,
      stream: current.stream || selectedLecture.stream || '',
      className: current.className || selectedLecture.className || '',
      courseName: current.courseName || selectedLecture.courseName || '',
      lecturerName: current.lecturerName || selectedLecture.lecturerName || '',
      totalRegisteredStudents:
        current.totalRegisteredStudents || String(selectedLecture.totalRegisteredStudents || ''),
      venue: current.venue || selectedLecture.venue || '',
      scheduledLectureTime: current.scheduledLectureTime || selectedLecture.scheduledTime || '',
    }));
  }, [assignedLectures, form.courseCode, isPrl, isViewer]);

  const screenTitle = useMemo(() => {
    if (isPrl) {
      return 'Review Report';
    }

    if (isViewer) {
      return 'Report Details';
    }

    return isEditing ? 'Update Report' : 'Create Report';
  }, [isEditing, isPrl, isViewer]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyAssignedLecture = (courseCode) => {
    const selectedLecture = assignedLectures.find((item) => item.courseCode === courseCode);

    if (!selectedLecture) {
      updateField('courseCode', courseCode);
      return;
    }

    setForm((current) => ({
      ...current,
      stream: selectedLecture.stream || current.stream || '',
      className: selectedLecture.className || '',
      courseName: selectedLecture.courseName || '',
      courseCode: selectedLecture.courseCode || courseCode,
      lecturerName: selectedLecture.lecturerName || current.lecturerName || '',
      totalRegisteredStudents: String(selectedLecture.totalRegisteredStudents || ''),
      venue: selectedLecture.venue || '',
      scheduledLectureTime: selectedLecture.scheduledTime || '',
    }));
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(form, isPrl);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      Alert.alert('Check your form', 'Please complete all required fields.');
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await updateReport(report.id, form);
      } else {
        await createReport(form);
      }

      Alert.alert('Success', 'Saved successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{screenTitle}</Text>
        <View style={styles.card}>
          {isPrl ? (
            <>
              <InputField label="Course" value={`${form.courseCode} - ${form.courseName}`} onChangeText={() => {}} editable={false} />
              <InputField label="Lecturer" value={form.lecturerName} onChangeText={() => {}} editable={false} />
              <InputField label="Topic Taught" value={form.topicTaught} onChangeText={() => {}} multiline editable={false} />
              <InputField
                label="PRL Feedback"
                value={form.prlFeedback}
                onChangeText={(value) => updateField('prlFeedback', value)}
                placeholder="Feedback"
                multiline
                error={errors.prlFeedback}
              />
              <OptionSelector label="Review Status" options={statusOptions} value={form.status} onChange={(value) => updateField('status', value)} />
            </>
          ) : isViewer ? (
            <>
              <InputField label="Faculty" value={form.facultyName} onChangeText={() => {}} editable={false} />
              <InputField label="Class Name" value={form.className} onChangeText={() => {}} editable={false} />
              <InputField label="Week of Reporting" value={form.weekOfReporting} onChangeText={() => {}} editable={false} />
              <InputField label="Date of Lecture" value={form.dateOfLecture} onChangeText={() => {}} editable={false} />
              <InputField label="Course Name" value={form.courseName} onChangeText={() => {}} editable={false} />
              <InputField label="Course Code" value={form.courseCode} onChangeText={() => {}} editable={false} />
              <InputField label="Lecturer Name" value={form.lecturerName} onChangeText={() => {}} editable={false} />
              <InputField label="Students Present" value={form.actualStudentsPresent} onChangeText={() => {}} editable={false} />
              <InputField label="Registered Students" value={form.totalRegisteredStudents} onChangeText={() => {}} editable={false} />
              <InputField label="Venue" value={form.venue} onChangeText={() => {}} editable={false} />
              <InputField label="Lecture Time" value={form.scheduledLectureTime} onChangeText={() => {}} editable={false} />
              <InputField label="Topic Taught" value={form.topicTaught} onChangeText={() => {}} editable={false} multiline />
              <InputField label="Learning Outcomes" value={form.learningOutcomes} onChangeText={() => {}} editable={false} multiline />
              <InputField label="Lecturer Recommendations" value={form.lecturerRecommendations} onChangeText={() => {}} editable={false} multiline />
              <InputField label="PRL Feedback" value={form.prlFeedback || 'No feedback yet'} onChangeText={() => {}} editable={false} multiline />
              <InputField label="Status" value={form.status} onChangeText={() => {}} editable={false} />
            </>
          ) : (
            <>
              <OptionSelector label="Faculty" options={FACULTIES} value={form.facultyName} onChange={(value) => updateField('facultyName', value)} error={errors.facultyName} />
              {assignedLectures.length ? (
                <OptionSelector
                  label="Assigned Course"
                  options={assignedLectures.map((item) => item.courseCode)}
                  value={form.courseCode}
                  onChange={applyAssignedLecture}
                />
              ) : null}
              <InputField label="Class Name" value={form.className} onChangeText={(value) => updateField('className', value)} placeholder="Class Name" error={errors.className} />
              <InputField label="Week of Reporting" value={form.weekOfReporting} onChangeText={(value) => updateField('weekOfReporting', value)} placeholder="Week 6" error={errors.weekOfReporting} />
              <InputField label="Date of Lecture" value={form.dateOfLecture} onChangeText={(value) => updateField('dateOfLecture', value)} placeholder="2026-05-03" error={errors.dateOfLecture} />
              <InputField label="Course Name" value={form.courseName} onChangeText={(value) => updateField('courseName', value)} placeholder="Course Name" error={errors.courseName} />
              <InputField label="Course Code" value={form.courseCode} onChangeText={(value) => updateField('courseCode', value)} placeholder="BIMP2210" autoCapitalize="characters" error={errors.courseCode} />
              <InputField label="Lecturer's Name" value={form.lecturerName} onChangeText={(value) => updateField('lecturerName', value)} placeholder="Lecturer Name" error={errors.lecturerName} />
              <InputField label="Actual Students Present" value={form.actualStudentsPresent} onChangeText={(value) => updateField('actualStudentsPresent', value)} placeholder="30" keyboardType="numeric" error={errors.actualStudentsPresent} />
              <InputField label="Total Registered Students" value={form.totalRegisteredStudents} onChangeText={(value) => updateField('totalRegisteredStudents', value)} placeholder="35" keyboardType="numeric" error={errors.totalRegisteredStudents} />
              <InputField label="Venue" value={form.venue} onChangeText={(value) => updateField('venue', value)} placeholder="Venue" error={errors.venue} />
              <InputField label="Scheduled Lecture Time" value={form.scheduledLectureTime} onChangeText={(value) => updateField('scheduledLectureTime', value)} placeholder="08:00 - 10:00" error={errors.scheduledLectureTime} />
              <InputField label="Topic Taught" value={form.topicTaught} onChangeText={(value) => updateField('topicTaught', value)} placeholder="Topic Taught" error={errors.topicTaught} />
              <InputField label="Learning Outcomes" value={form.learningOutcomes} onChangeText={(value) => updateField('learningOutcomes', value)} placeholder="Learning Outcomes" multiline error={errors.learningOutcomes} />
              <InputField label="Lecturer Recommendations" value={form.lecturerRecommendations} onChangeText={(value) => updateField('lecturerRecommendations', value)} placeholder="Recommendations" multiline error={errors.lecturerRecommendations} />
            </>
          )}

          {!isViewer ? (
            <CustomButton title={isPrl ? 'Save Review' : 'Save Report'} variant="success" onPress={handleSubmit} loading={loading} />
          ) : null}
          <CustomButton
            title="Back"
            variant="accent"
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          />
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
