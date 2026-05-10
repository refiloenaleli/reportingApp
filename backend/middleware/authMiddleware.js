const { getFirebaseAdmin } = require('../services/firebaseAdmin');

async function authenticateRequest(request, response, next) {
  try {
    const header = request.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return response.status(401).json({
        message: 'Authorization token is required.',
      });
    }

    const idToken = header.replace('Bearer ', '').trim();
    const { auth, db } = getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();

    if (!userSnapshot.exists) {
      return response.status(403).json({
        message: 'User profile not found.',
      });
    }

    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userSnapshot.data(),
    };

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return response.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
}

module.exports = {
  authenticateRequest,
};
