const { getFirebaseAdmin } = require('../services/firebaseAdmin');
const { FACULTIES } = require('../config/moduleConfig');
const {
  notifyReportCreated,
  notifyReportFeedback,
} = require('../services/notificationService');

const reviewerRoles = ['prl'];
const viewerRoles = ['prl', 'pl'];
const allowedStatuses = ['pending', 'reviewed', 'approved', 'submitted', 'resolved'];

function validateReportPayload(payload) {
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

  const hasMissingField = requiredFields.some(
    (field) => !String(payload[field] ?? '').trim()
  );

  if (hasMissingField) {
    return 'All lecturer report fields are required.';
  }

  if (!FACULTIES.includes(String(payload.facultyName || '').trim())) {
    return 'Please select a valid faculty.';
  }

  if (
    Number.isNaN(Number(payload.actualStudentsPresent)) ||
    Number.isNaN(Number(payload.totalRegisteredStudents))
  ) {
    return 'Student totals must be valid numbers.';
  }

  const normalizedStatus = String(payload.status || 'pending').trim().toLowerCase();

  if (!allowedStatuses.includes(normalizedStatus)) {
    return 'Status must be pending, reviewed, or approved.';
  }

  return null;
}

function validateFeedbackPayload(payload) {
  const normalizedStatus = String(payload.status || 'reviewed').trim().toLowerCase();

  if (!allowedStatuses.includes(normalizedStatus)) {
    return 'Status must be pending, reviewed, or approved.';
  }

  if (!String(payload.prlFeedback || '').trim()) {
    return 'PRL feedback is required.';
  }

  return null;
}

function serializeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  return value;
}

function serializeReport(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function canReviewReports(role) {
  return reviewerRoles.includes(role);
}

function canViewAllReports(role) {
  return viewerRoles.includes(role);
}

async function createReport(request, response) {
  try {
    if (request.user.role !== 'lecturer') {
      return response.status(403).json({
        message: 'Only lecturers can create lecturer reports.',
      });
    }

    const validationError = validateReportPayload(request.body);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const { db, FieldValue } = getFirebaseAdmin();
    const payload = {
      facultyName: request.body.facultyName.trim(),
      stream: String(request.body.stream || '').trim(),
      className: request.body.className.trim(),
      weekOfReporting: request.body.weekOfReporting.trim(),
      dateOfLecture: request.body.dateOfLecture.trim(),
      courseName: request.body.courseName.trim(),
      courseCode: request.body.courseCode.trim().toUpperCase(),
      lecturerName: request.body.lecturerName.trim(),
      actualStudentsPresent: Number(request.body.actualStudentsPresent),
      totalRegisteredStudents: Number(request.body.totalRegisteredStudents),
      venue: request.body.venue.trim(),
      scheduledLectureTime: request.body.scheduledLectureTime.trim(),
      topicTaught: request.body.topicTaught.trim(),
      learningOutcomes: request.body.learningOutcomes.trim(),
      lecturerRecommendations: request.body.lecturerRecommendations.trim(),
      prlFeedback: '',
      status: String(request.body.status || 'pending').trim().toLowerCase(),
      createdBy: request.user.uid,
      authorName: request.user.name,
      authorEmail: request.user.email,
      authorRole: request.user.role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const documentReference = await db.collection('reports').add(payload);
    const savedReport = await documentReference.get();
    const serializedReport = serializeReport(savedReport);

    await notifyReportCreated(serializedReport);

    return response.status(201).json({
      message: 'Report created successfully.',
      report: serializedReport,
    });
  } catch (error) {
    console.error('Create report error:', error);
    return response.status(500).json({
      message: error.message || 'Could not create report.',
    });
  }
}

async function getReports(request, response) {
  try {
    const { db } = getFirebaseAdmin();
    let snapshot;

    if (request.user.role === 'student') {
      return response.status(200).json({
        reports: [],
      });
    }

    if (request.user.role === 'prl') {
      let query = db.collection('reports').where('facultyName', '==', request.user.facultyName);

      if (request.user.streamName) {
        query = query.where('stream', '==', request.user.streamName);
      }

      snapshot = await query.get();
    } else if (request.user.role === 'lecturer') {
      let query = db.collection('reports').where('facultyName', '==', request.user.facultyName);

      if (request.user.streamName) {
        query = query.where('stream', '==', request.user.streamName);
      }

      snapshot = await query.get();
    } else if (canViewAllReports(request.user.role)) {
      snapshot = await db.collection('reports').orderBy('createdAt', 'desc').get();
    }

    const reports = snapshot.docs
      .map(serializeReport)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

    return response.status(200).json({
      reports,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return response.status(500).json({
      message: error.message || 'Could not load reports.',
    });
  }
}

async function updateReport(request, response) {
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const reportReference = db.collection('reports').doc(request.params.id);
    const snapshot = await reportReference.get();

    if (!snapshot.exists) {
      return response.status(404).json({
        message: 'Report not found.',
      });
    }

    const report = snapshot.data();
    const isOwner = report.createdBy === request.user.uid;
    const isReviewer = canReviewReports(request.user.role);

    if (request.user.role === 'lecturer') {
      if (!isOwner) {
        return response.status(403).json({
          message: 'You do not have permission to update this report.',
        });
      }

      const validationError = validateReportPayload(request.body);

      if (validationError) {
        return response.status(400).json({ message: validationError });
      }

      await reportReference.update({
        facultyName: request.body.facultyName.trim(),
        stream: String(request.body.stream || report.stream || '').trim(),
        className: request.body.className.trim(),
        weekOfReporting: request.body.weekOfReporting.trim(),
        dateOfLecture: request.body.dateOfLecture.trim(),
        courseName: request.body.courseName.trim(),
        courseCode: request.body.courseCode.trim().toUpperCase(),
        lecturerName: request.body.lecturerName.trim(),
        actualStudentsPresent: Number(request.body.actualStudentsPresent),
        totalRegisteredStudents: Number(request.body.totalRegisteredStudents),
        venue: request.body.venue.trim(),
        scheduledLectureTime: request.body.scheduledLectureTime.trim(),
        topicTaught: request.body.topicTaught.trim(),
        learningOutcomes: request.body.learningOutcomes.trim(),
        lecturerRecommendations: request.body.lecturerRecommendations.trim(),
        updatedAt: FieldValue.serverTimestamp(),
        lastUpdatedBy: request.user.uid,
      });
    } else if (isReviewer) {
      const validationError = validateFeedbackPayload(request.body);

      if (validationError) {
        return response.status(400).json({ message: validationError });
      }

      await reportReference.update({
        prlFeedback: request.body.prlFeedback.trim(),
        status: String(request.body.status || 'reviewed').trim().toLowerCase(),
        updatedAt: FieldValue.serverTimestamp(),
        lastUpdatedBy: request.user.uid,
        reviewedBy: request.user.uid,
      });
    } else {
      return response.status(403).json({
        message: 'You do not have permission to update this report.',
      });
    }

    const updatedSnapshot = await reportReference.get();
    const serializedReport = serializeReport(updatedSnapshot);

    if (isReviewer) {
      await notifyReportFeedback(serializedReport);
    }

    return response.status(200).json({
      message: 'Report updated successfully.',
      report: serializedReport,
    });
  } catch (error) {
    console.error('Update report error:', error);
    return response.status(500).json({
      message: error.message || 'Could not update report.',
    });
  }
}

async function deleteReport(request, response) {
  try {
    const { db } = getFirebaseAdmin();
    const reportReference = db.collection('reports').doc(request.params.id);
    const snapshot = await reportReference.get();

    if (!snapshot.exists) {
      return response.status(404).json({
        message: 'Report not found.',
      });
    }

    const report = snapshot.data();
    const isOwner = report.createdBy === request.user.uid;

    if (request.user.role !== 'lecturer' || !isOwner) {
      return response.status(403).json({
        message: 'You do not have permission to delete this report.',
      });
    }

    await reportReference.delete();

    return response.status(200).json({
      message: 'Report deleted successfully.',
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return response.status(500).json({
      message: error.message || 'Could not delete report.',
    });
  }
}

module.exports = {
  createReport,
  getReports,
  updateReport,
  deleteReport,
};
