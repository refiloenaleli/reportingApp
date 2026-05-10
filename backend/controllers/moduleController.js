const { getFirebaseAdmin } = require('../services/firebaseAdmin');
const { FACULTIES, moduleDefinitions } = require('../config/moduleConfig');
const { notifyCourseAssigned } = require('../services/notificationService');

function getModuleDefinition(moduleKey) {
  return moduleDefinitions[moduleKey];
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

function serializeDocument(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function resolvePermission(definition, role, action) {
  return definition.roles?.[role]?.[action] ?? false;
}

function validateModulePayload(moduleKey, payload) {
  const definition = getModuleDefinition(moduleKey);

  if (!definition) {
    return 'Unknown module.';
  }

  if (!FACULTIES.includes(String(payload.facultyName || '').trim())) {
    return 'Please select a valid faculty.';
  }

  const missingField = definition.requiredFields.find(
    (field) => !String(payload[field] ?? '').trim()
  );

  if (missingField) {
    return 'All required fields must be completed.';
  }

  for (const numericField of definition.numericFields) {
    if (Number.isNaN(Number(payload[numericField]))) {
      return `${numericField} must be a valid number.`;
    }
  }

  if (moduleKey === 'ratings') {
    const score = Number(payload.ratingScore);

    if (score < 1 || score > 5) {
      return 'Rating score must be between 1 and 5.';
    }
  }

  return null;
}

function buildPayload(moduleKey, payload, user, FieldValue) {
  const definition = getModuleDefinition(moduleKey);
  const modulePayload = {};

  definition.requiredFields.forEach((field) => {
    const rawValue = payload[field];

    if (definition.numericFields.includes(field)) {
      modulePayload[field] = Number(rawValue);
    } else if (field.toLowerCase().includes('email')) {
      modulePayload[field] = String(rawValue).trim().toLowerCase();
    } else if (field.toLowerCase().includes('coursecode')) {
      modulePayload[field] = String(rawValue).trim().toUpperCase();
    } else {
      modulePayload[field] = String(rawValue).trim();
    }
  });

  if (moduleKey === 'attendance' && user.role === 'student') {
    modulePayload.studentEmail = String(user.email || '').trim().toLowerCase();
    modulePayload.studentName = String(user.name || modulePayload.studentName || '').trim();
    modulePayload.stream = String(user.streamName || modulePayload.stream || '').trim();
  }

  return {
    ...modulePayload,
    createdBy: user.uid,
    authorName: user.name,
    authorEmail: user.email,
    authorRole: user.role,
    authorFaculty: user.facultyName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildLectureAssignmentPayload(coursePayload, dataOwner, FieldValue) {
  return {
    facultyName: coursePayload.facultyName,
    stream: coursePayload.stream,
    lecturerName: coursePayload.assignedLecturerName,
    lecturerEmail: coursePayload.assignedLecturerEmail.toLowerCase(),
    courseCode: coursePayload.courseCode,
    courseName: coursePayload.courseName,
    className: coursePayload.className,
    semester: coursePayload.semester,
    totalRegisteredStudents: Number(coursePayload.totalRegisteredStudents),
    venue: coursePayload.venue,
    scheduledTime: coursePayload.scheduledTime,
    createdBy: dataOwner.uid,
    authorName: dataOwner.name,
    authorEmail: dataOwner.email,
    authorRole: dataOwner.role,
    authorFaculty: dataOwner.facultyName,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildClassPayload(coursePayload, dataOwner, FieldValue) {
  return {
    facultyName: coursePayload.facultyName,
    stream: coursePayload.stream,
    className: coursePayload.className,
    courseName: coursePayload.courseName,
    courseCode: coursePayload.courseCode,
    semester: coursePayload.semester,
    venue: coursePayload.venue,
    scheduledTime: coursePayload.scheduledTime,
    assignedLecturerName: coursePayload.assignedLecturerName,
    assignedLecturerEmail: coursePayload.assignedLecturerEmail.toLowerCase(),
    totalRegisteredStudents: Number(coursePayload.totalRegisteredStudents),
    createdBy: dataOwner.uid,
    authorName: dataOwner.name,
    authorEmail: dataOwner.email,
    authorRole: dataOwner.role,
    authorFaculty: dataOwner.facultyName,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function syncLectureAssignment(db, sourceData, sourceDocId, dataOwner, FieldValue, isNew) {
  const lecturePayload = buildLectureAssignmentPayload(sourceData, dataOwner, FieldValue);
  const lectureReference = db.collection('lectures').doc(sourceDocId);

  if (isNew) {
    await lectureReference.set({
      ...lecturePayload,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await lectureReference.set(
    {
      ...lecturePayload,
    },
    { merge: true }
  );
}

async function syncClassRecord(db, sourceData, sourceDocId, dataOwner, FieldValue, isNew) {
  const classPayload = buildClassPayload(sourceData, dataOwner, FieldValue);
  const classReference = db.collection('classes').doc(sourceDocId);

  if (isNew) {
    await classReference.set({
      ...classPayload,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await classReference.set(
    {
      ...classPayload,
    },
    { merge: true }
  );
}

async function attachAttendanceStudentProfile(db, payload) {
  if (!payload.studentEmail) {
    return payload;
  }

  const snapshot = await db
    .collection('users')
    .where('email', '==', String(payload.studentEmail).trim().toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    return payload;
  }

  const studentProfile = snapshot.docs[0].data();

  return {
    ...payload,
    studentUid: snapshot.docs[0].id,
    studentStream: studentProfile.streamName || '',
    stream: payload.stream || studentProfile.streamName || '',
  };
}

async function getModuleRecords(request, response) {
  try {
    const definition = getModuleDefinition(request.params.moduleKey);

    if (!definition) {
      return response.status(404).json({ message: 'Module not found.' });
    }

    const permission = resolvePermission(definition, request.user.role, 'read');

    if (!permission) {
      return response.status(403).json({ message: 'You do not have access to this module.' });
    }

    const { db } = getFirebaseAdmin();
    let query = db.collection(definition.collection);

    if (permission === 'own') {
      query = query.where('createdBy', '==', request.user.uid);
    } else if (permission === 'studentLinked') {
      query = query.where('studentEmail', '==', String(request.user.email || '').toLowerCase());
    } else if (permission === 'assigned') {
      query = query.where('lecturerEmail', '==', String(request.user.email || '').toLowerCase());
    } else if (permission === 'faculty') {
      query = query.where('facultyName', '==', request.user.facultyName);

      if (
        ['student', 'lecturer', 'prl'].includes(request.user.role) &&
        request.user.streamName &&
        ['attendance', 'courses', 'lectures', 'classes', 'monitoring'].includes(request.params.moduleKey)
      ) {
        query = query.where('stream', '==', request.user.streamName);
      }
    }

    const snapshot = await query.get();
    const records = snapshot.docs
      .map(serializeDocument)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));

    return response.status(200).json({
      records,
    });
  } catch (error) {
    console.error('Get module records error:', error);
    return response.status(500).json({
      message: error.message || 'Could not load records.',
    });
  }
}

async function createModuleRecord(request, response) {
  try {
    const definition = getModuleDefinition(request.params.moduleKey);

    if (!definition) {
      return response.status(404).json({ message: 'Module not found.' });
    }

    const permission = resolvePermission(definition, request.user.role, 'create');

    if (!permission) {
      return response.status(403).json({ message: 'You do not have permission to create here.' });
    }

    const validationError = validateModulePayload(request.params.moduleKey, request.body);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const { db, FieldValue } = getFirebaseAdmin();
    let payload = buildPayload(request.params.moduleKey, request.body, request.user, FieldValue);

    if (request.params.moduleKey === 'attendance') {
      payload = await attachAttendanceStudentProfile(db, payload);
    }

    const docRef = await db.collection(definition.collection).add(payload);

    if (request.params.moduleKey === 'courses') {
      await syncLectureAssignment(db, payload, docRef.id, request.user, FieldValue, true);
      await syncClassRecord(db, payload, docRef.id, request.user, FieldValue, true);
    }

    const saved = await docRef.get();
    const serializedRecord = serializeDocument(saved);

    if (request.params.moduleKey === 'courses') {
      await notifyCourseAssigned(serializedRecord);
    }

    return response.status(201).json({
      message: 'Record created successfully.',
      record: serializedRecord,
    });
  } catch (error) {
    console.error('Create module record error:', error);
    return response.status(500).json({
      message: error.message || 'Could not create record.',
    });
  }
}

async function updateModuleRecord(request, response) {
  try {
    const definition = getModuleDefinition(request.params.moduleKey);

    if (!definition) {
      return response.status(404).json({ message: 'Module not found.' });
    }

    const permission = resolvePermission(definition, request.user.role, 'update');

    if (!permission) {
      return response.status(403).json({ message: 'You do not have permission to update here.' });
    }

    const validationError = validateModulePayload(request.params.moduleKey, request.body);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const { db, FieldValue } = getFirebaseAdmin();
    const docRef = db.collection(definition.collection).doc(request.params.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return response.status(404).json({ message: 'Record not found.' });
    }

    const data = snapshot.data();
    const canUpdate =
      permission === 'all' ||
      (permission === 'own' && data.createdBy === request.user.uid) ||
      (permission === 'faculty' && data.facultyName === request.user.facultyName);

    if (!canUpdate) {
      return response.status(403).json({ message: 'You do not have permission to update this record.' });
    }

    let nextPayload = buildPayload(request.params.moduleKey, request.body, request.user, FieldValue);
    delete nextPayload.createdAt;
    nextPayload.createdBy = data.createdBy;
    nextPayload.authorName = data.authorName;
    nextPayload.authorEmail = data.authorEmail;
    nextPayload.authorRole = data.authorRole;
    nextPayload.authorFaculty = data.authorFaculty;
    nextPayload.updatedAt = FieldValue.serverTimestamp();
    nextPayload.lastUpdatedBy = request.user.uid;

    if (request.params.moduleKey === 'attendance') {
      nextPayload = await attachAttendanceStudentProfile(db, nextPayload);
    }

    await docRef.update(nextPayload);

    if (request.params.moduleKey === 'courses') {
      await syncLectureAssignment(db, nextPayload, request.params.id, request.user, FieldValue, false);
      await syncClassRecord(db, nextPayload, request.params.id, request.user, FieldValue, false);
    }

    const updated = await docRef.get();
    const serializedRecord = serializeDocument(updated);

    if (request.params.moduleKey === 'courses') {
      await notifyCourseAssigned(serializedRecord);
    }

    return response.status(200).json({
      message: 'Record updated successfully.',
      record: serializedRecord,
    });
  } catch (error) {
    console.error('Update module record error:', error);
    return response.status(500).json({
      message: error.message || 'Could not update record.',
    });
  }
}

async function deleteModuleRecord(request, response) {
  try {
    const definition = getModuleDefinition(request.params.moduleKey);

    if (!definition) {
      return response.status(404).json({ message: 'Module not found.' });
    }

    const permission = resolvePermission(definition, request.user.role, 'delete');

    if (!permission) {
      return response.status(403).json({ message: 'You do not have permission to delete here.' });
    }

    const { db } = getFirebaseAdmin();
    const docRef = db.collection(definition.collection).doc(request.params.id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return response.status(404).json({ message: 'Record not found.' });
    }

    const data = snapshot.data();
    const canDelete =
      permission === 'all' ||
      (permission === 'own' && data.createdBy === request.user.uid) ||
      (permission === 'faculty' && data.facultyName === request.user.facultyName);

    if (!canDelete) {
      return response.status(403).json({ message: 'You do not have permission to delete this record.' });
    }

    await docRef.delete();

    if (request.params.moduleKey === 'courses') {
      await db.collection('lectures').doc(request.params.id).delete().catch(() => null);
      await db.collection('classes').doc(request.params.id).delete().catch(() => null);
    }

    return response.status(200).json({
      message: 'Record deleted successfully.',
    });
  } catch (error) {
    console.error('Delete module record error:', error);
    return response.status(500).json({
      message: error.message || 'Could not delete record.',
    });
  }
}

module.exports = {
  FACULTIES,
  moduleDefinitions,
  getModuleRecords,
  createModuleRecord,
  updateModuleRecord,
  deleteModuleRecord,
};
