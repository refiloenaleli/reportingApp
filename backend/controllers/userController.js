const { getFirebaseAdmin } = require('../services/firebaseAdmin');
const { FACULTIES } = require('../config/moduleConfig');

function serializeUser(snapshot) {
  return {
    uid: snapshot.id,
    ...snapshot.data(),
  };
}

function assertVisibilityAccess(role) {
  return ['student', 'lecturer', 'prl', 'pl'].includes(role);
}

async function listUsers(request, response) {
  try {
    if (!assertVisibilityAccess(request.user.role)) {
      return response.status(403).json({
        message: 'You do not have access to users.',
      });
    }

    const requestedRole = String(request.query.role || '').trim().toLowerCase();
    const { db } = getFirebaseAdmin();
    let query = db.collection('users').where('facultyName', '==', request.user.facultyName);

    if (requestedRole) {
      query = query.where('role', '==', requestedRole);
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map(serializeUser);

    if (request.user.role === 'student') {
      users = users.filter((user) => user.role === 'lecturer');
    }

    if (request.user.role === 'lecturer') {
      users = users.filter((user) => {
        if (requestedRole === 'student') {
          return user.role === 'student' && (!request.user.streamName || user.streamName === request.user.streamName);
        }

        if (requestedRole === 'lecturer') {
          return user.role === 'lecturer';
        }

        return ['student', 'lecturer'].includes(user.role) && (!request.user.streamName || !user.streamName || user.streamName === request.user.streamName);
      });
    }

    if (request.user.role === 'prl' && request.user.streamName) {
      users = users.filter((user) => !user.streamName || user.streamName === request.user.streamName);
    }

    users.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

    return response.status(200).json({
      users,
    });
  } catch (error) {
    console.error('List users error:', error);
    return response.status(500).json({
      message: error.message || 'Could not load users.',
    });
  }
}

async function createLecturer(request, response) {
  try {
    if (request.user.role !== 'pl') {
      return response.status(403).json({
        message: 'Only Program Leaders can create lecturer accounts.',
      });
    }

    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '').trim();
    const facultyName = String(request.body.facultyName || request.user.facultyName || '').trim();
    const streamName = String(request.body.streamName || '').trim();

    if (!name || !email || !password) {
      return response.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return response.status(400).json({
        message: 'Password must be at least 6 characters long.',
      });
    }

    if (!FACULTIES.includes(facultyName)) {
      return response.status(400).json({
        message: 'Please select a valid faculty.',
      });
    }

    const { auth, db } = getFirebaseAdmin();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'lecturer',
    });

    const profile = {
      uid: userRecord.uid,
      name,
      email,
      role: 'lecturer',
      facultyName,
      streamName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(profile);

    return response.status(201).json({
      message: 'Lecturer account created successfully.',
      user: profile,
    });
  } catch (error) {
    console.error('Create lecturer error:', error);
    return response.status(error.code === 'auth/email-already-exists' ? 409 : 500).json({
      message:
        error.code === 'auth/email-already-exists'
          ? 'That email is already registered.'
          : error.message || 'Could not create lecturer.',
    });
  }
}

module.exports = {
  listUsers,
  createLecturer,
};
