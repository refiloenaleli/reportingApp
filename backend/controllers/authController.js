const { getFirebaseAdmin } = require('../services/firebaseAdmin');
const { FACULTIES } = require('../config/moduleConfig');

const allowedRoles = ['student', 'lecturer', 'prl', 'pl'];

function normalizeProfile(userRecord, payload) {
  return {
    uid: userRecord.uid,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    facultyName: payload.facultyName,
    streamName: String(payload.streamName || '').trim(),
    studentId: String(payload.studentId || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validateRegistration(payload) {
  if (!payload.name || !payload.email || !payload.password || !payload.role || !payload.facultyName) {
    return 'Name, email, password, role, and faculty are required.';
  }

  if (payload.password.trim().length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  if (!allowedRoles.includes(payload.role)) {
    return 'Role must be student, lecturer, prl, or pl.';
  }

  if (!FACULTIES.includes(payload.facultyName)) {
    return 'Please select a valid faculty.';
  }

  if (['student', 'lecturer', 'prl'].includes(payload.role) && !String(payload.streamName || '').trim()) {
    return 'This role must include a stream.';
  }

  if (payload.role === 'student' && !String(payload.studentId || '').trim()) {
    return 'Student accounts must include a student ID.';
  }

  return null;
}

async function register(request, response) {
  try {
    const validationError = validateRegistration(request.body);

    if (validationError) {
      return response.status(400).json({ message: validationError });
    }

    const { auth, db } = getFirebaseAdmin();
    const email = request.body.email.trim().toLowerCase();

    const userRecord = await auth.createUser({
      email,
      password: request.body.password,
      displayName: request.body.name.trim(),
    });

    await auth.setCustomUserClaims(userRecord.uid, {
      role: request.body.role,
    });

    const profile = normalizeProfile(userRecord, {
      ...request.body,
      email,
    });

    await db.collection('users').doc(userRecord.uid).set(profile);

    const customToken = await auth.createCustomToken(userRecord.uid, {
      role: request.body.role,
    });

    return response.status(201).json({
      message: 'Account created successfully.',
      customToken,
      profile,
    });
  } catch (error) {
    console.error('Register error:', error);

    return response.status(error.code === 'auth/email-already-exists' ? 409 : 500).json({
      message:
        error.code === 'auth/email-already-exists'
          ? 'That email is already registered.'
          : error.message || 'Could not register user.',
    });
  }
}

async function login(request, response) {
  try {
    const email = String(request.body.email || '').trim().toLowerCase();
    const password = String(request.body.password || '').trim();

    if (!email || !password) {
      return response.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const { auth, db, firebaseWebApiKey } = getFirebaseAdmin();

    if (!firebaseWebApiKey) {
      return response.status(500).json({
        message: 'Firebase Web API key is missing from the project configuration.',
      });
    }

    const loginResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData.localId) {
      return response.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const profileSnapshot = await db.collection('users').doc(loginData.localId).get();

    if (!profileSnapshot.exists) {
      return response.status(404).json({
        message: 'User profile not found.',
      });
    }

    const profile = profileSnapshot.data();
    const customToken = await auth.createCustomToken(loginData.localId, {
      role: profile.role,
    });

    return response.status(200).json({
      message: 'Login successful.',
      customToken,
      profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    return response.status(500).json({
      message: error.message || 'Could not sign in.',
    });
  }
}

async function getCurrentUser(request, response) {
  return response.status(200).json({
    profile: request.user,
  });
}

module.exports = {
  register,
  login,
  getCurrentUser,
};
