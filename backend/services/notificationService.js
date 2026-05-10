const { getFirebaseAdmin } = require('./firebaseAdmin');

async function saveNotificationToken({ uid, token, tokenType, platform, facultyName, role }) {
  const { db, FieldValue } = getFirebaseAdmin();

  await db.collection('notificationTokens').doc(`${uid}_${platform}`).set({
    uid,
    token,
    tokenType,
    platform,
    facultyName,
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function getTokensForUsers(userIds) {
  if (!userIds.length) {
    return [];
  }

  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection('notificationTokens').get();

  return snapshot.docs
    .map((doc) => doc.data())
    .filter((entry) => userIds.includes(entry.uid) && entry.token && entry.tokenType === 'fcm');
}

async function getRecipientsByFilter({ role, facultyName, email }) {
  const { db } = getFirebaseAdmin();
  let query = db.collection('users');

  if (role) {
    query = query.where('role', '==', role);
  }

  if (facultyName) {
    query = query.where('facultyName', '==', facultyName);
  }

  const snapshot = await query.get();
  let users = snapshot.docs.map((doc) => doc.data());

  if (email) {
    users = users.filter(
      (user) => String(user.email || '').toLowerCase() === String(email).toLowerCase()
    );
  }

  return users;
}

async function createNotificationRecord({ userId, title, body, type, relatedId }) {
  const { db, FieldValue } = getFirebaseAdmin();

  await db.collection('notifications').add({
    userId: userId || null,
    audience: userId ? 'user' : 'all',
    title,
    body,
    type,
    relatedId: relatedId || null,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function sendFirebaseMessages(tokens, title, body, data = {}) {
  if (!tokens.length) {
    return;
  }

  const { admin } = getFirebaseAdmin();
  const multicastMessage = {
    tokens: tokens.map((entry) => entry.token),
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value ?? '')])
    ),
  };

  try {
    await admin.messaging().sendEachForMulticast(multicastMessage);
  } catch (error) {
    console.error('Push notification send error:', error);
  }
}

async function notifyUsers(users, payload) {
  if (!users.length) {
    return;
  }

  const uniqueUsers = users.filter(
    (user, index, list) => list.findIndex((entry) => entry.uid === user.uid) === index
  );

  await Promise.all(
    uniqueUsers.map((user) =>
      createNotificationRecord({
        userId: user.uid,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        relatedId: payload.relatedId,
      })
    )
  );

  const tokens = await getTokensForUsers(uniqueUsers.map((user) => user.uid));
  await sendFirebaseMessages(tokens, payload.title, payload.body, {
    type: payload.type,
    relatedId: payload.relatedId,
  });
}

async function notifyReportCreated(report) {
  const prls = await getRecipientsByFilter({
    role: 'prl',
    facultyName: report.facultyName,
  });
  const pls = await getRecipientsByFilter({ role: 'pl' });

  await notifyUsers([...prls, ...pls], {
    title: 'New Lecturer Report',
    body: `${report.courseCode} report submitted by ${report.lecturerName}.`,
    type: 'report_created',
    relatedId: report.id,
  });
}

async function notifyReportFeedback(report) {
  const { db } = getFirebaseAdmin();
  const userSnapshot = await db.collection('users').doc(report.createdBy).get();

  if (!userSnapshot.exists) {
    return;
  }

  await notifyUsers([userSnapshot.data()], {
    title: 'PRL Feedback Added',
    body: `Feedback was added to your ${report.courseCode} report.`,
    type: 'report_feedback',
    relatedId: report.id,
  });
}

async function notifyCourseAssigned(course) {
  const lecturers = await getRecipientsByFilter({
    role: 'lecturer',
    email: course.assignedLecturerEmail,
  });

  await notifyUsers(lecturers, {
    title: 'New Course Assignment',
    body: `${course.courseCode} has been assigned to you.`,
    type: 'course_assigned',
    relatedId: course.id,
  });
}

async function getUserNotifications(uid) {
  const { db } = getFirebaseAdmin();
  const [personalSnapshot, broadcastSnapshot] = await Promise.all([
    db.collection('notifications').where('userId', '==', uid).get(),
    db.collection('notifications').where('audience', '==', 'all').get(),
  ]);

  return [...personalSnapshot.docs, ...broadcastSnapshot.docs]
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null,
      };
    })
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

async function markNotificationRead(notificationId, uid) {
  const { db } = getFirebaseAdmin();
  const reference = db.collection('notifications').doc(notificationId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return false;
  }

  const data = snapshot.data();

  if (data.audience === 'all') {
    return true;
  }

  if (data.userId && data.userId !== uid) {
    return false;
  }

  await reference.update({
    isRead: true,
  });

  return true;
}

module.exports = {
  saveNotificationToken,
  notifyReportCreated,
  notifyReportFeedback,
  notifyCourseAssigned,
  getUserNotifications,
  markNotificationRead,
};
